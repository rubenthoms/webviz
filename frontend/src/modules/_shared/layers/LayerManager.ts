import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { BaseLayer } from "./BaseLayer";
import { LayerGroup, LayerGroupTopic } from "./LayerGroup";
import { BaseSetting, SettingTopic } from "./settings/BaseSetting";
import { SettingType } from "./settings/SettingTypes";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
    LAYERS_CHANGED = "layers-changed",
    LAYERS_CHANGED_RECURSIVELY = "layers-changed-recursively",
    SETTINGS_CHANGED = "settings-changed",
}

export type LayerManagerTopicValueTypes = {
    [LayerManagerTopic.ITEMS_CHANGED]: LayerManagerItem[];
    [LayerManagerTopic.LAYERS_CHANGED_RECURSIVELY]: BaseLayer<any, any>[];
    [LayerManagerTopic.LAYERS_CHANGED]: BaseLayer<any, any>[];
    [LayerManagerTopic.SETTINGS_CHANGED]: void;
};

export type LayerManagerItem = BaseLayer<any, any> | LayerGroup | BaseSetting<any>;

export class LayerManager {
    private _queryClient: QueryClient | null = null;
    private _subscribers: Map<LayerManagerTopic, Set<() => void>> = new Map();
    private _items: LayerManagerItem[] = [];
    private _allLayers: BaseLayer<any, any>[] = [];
    private _settingsIteration: number = 0;

    setQueryClient(queryClient: QueryClient): void {
        this._queryClient = queryClient;
    }

    getQueryClient(): QueryClient {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        return this._queryClient;
    }

    addLayer(layer: BaseLayer<any, any>): void {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        layer.setName(this.makeUniqueLayerName(layer.getName()));
        layer.setQueryClient(this._queryClient);
        this._items = [layer, ...this._items];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
        this._allLayers = this.getAllLayersRecursively();
    }

    insertLayer(layer: BaseLayer<any, any>, position: number): void {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        layer.setQueryClient(this._queryClient);
        layer.setName(this.makeUniqueLayerName(layer.getName()));
        this._items = [...this._items.slice(0, position), layer, ...this._items.slice(position)];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
        this._allLayers = this.getAllLayersRecursively();
    }

    addGroup(name: string): void {
        const uniqueName = this.makeUniqueGroupName(name);
        const group = new LayerGroup(uniqueName, this);
        this._items = [group, ...this._items];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
        group.subscribe(LayerGroupTopic.LAYERS_CHANGED, () => {
            this._allLayers = this.getAllLayersRecursively();
            this.notifySubscribers(LayerManagerTopic.LAYERS_CHANGED_RECURSIVELY);
        });
    }

    insertGroup(group: LayerGroup, position: number): void {
        this._items = [...this._items.slice(0, position), group, ...this._items.slice(position)];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    addSetting(setting: BaseSetting<any>): void {
        this._items = [setting, ...this._items];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
        setting.subscribe(SettingTopic.VALUE, () => {
            this._settingsIteration++;
            this.notifySubscribers(LayerManagerTopic.SETTINGS_CHANGED);
        });
    }

    getSettings(): BaseSetting<any>[] {
        return this._items.filter((item) => item instanceof BaseSetting) as BaseSetting<any>[];
    }

    getSettingOfType(type: SettingType): BaseSetting<any> | undefined {
        return this.getSettings().find((setting) => setting.getKey() === type);
    }

    getSettingsOverridesForLayer(layer: BaseLayer<any, any>): BaseSetting<any>[] {
        const settingsOverrides: BaseSetting<any>[] = [];
        for (const setting of this.getSettings()) {
            settingsOverrides.push(setting);
        }

        for (const group of this.getAllGroups()) {
            if (group.getLayers().includes(layer)) {
                for (const setting of this.getSettings()) {
                    settingsOverrides.push(setting);
                }
            }
        }

        return settingsOverrides;
    }

    removeLayer(id: string): void {
        this._items = this._items.filter((item) => item.getId() !== id);
        this._allLayers = this.getAllLayersRecursively();
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    removeGroup(id: string): void {
        this._items = this._items.filter((item) => item.getId() !== id);
        this._allLayers = this.getAllLayersRecursively();
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    getItem(id: string): LayerManagerItem | undefined {
        return this._items.find((item) => item.getId() === id);
    }

    getLayer(id: string): BaseLayer<any, any> | undefined {
        const item = this.getItem(id);
        if (item instanceof BaseLayer) {
            return item;
        }
        return undefined;
    }

    getGroup(id: string): LayerGroup | undefined {
        const item = this.getItem(id);
        if (item instanceof LayerGroup) {
            return item;
        }
        return undefined;
    }

    getItems(): LayerManagerItem[] {
        return this._items;
    }

    changeOrder(order: string[]): void {
        this._items = order.map((id) => this._items.find((item) => item.getId() === id)).filter(Boolean) as BaseLayer<
            any,
            any
        >[];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    subscribe(topic: LayerManagerTopic, subscriber: () => void): void {
        const subscribers = this._subscribers.get(topic) ?? new Set();
        subscribers.add(subscriber);
        this._subscribers.set(topic, subscribers);
    }

    private notifySubscribers(topic: LayerManagerTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    private getAllLayersRecursively(): BaseLayer<any, any>[] {
        const layers: BaseLayer<any, any>[] = [];
        for (const item of this._items) {
            if (item instanceof BaseLayer) {
                layers.push(item);
            } else if (item instanceof LayerGroup) {
                layers.push(...item.getLayers());
            }
        }
        return layers;
    }

    private getAllGroups(): LayerGroup[] {
        return this._items.filter((item) => item instanceof LayerGroup) as LayerGroup[];
    }

    makeUniqueLayerName(name: string): string {
        let potentialName = name;
        let i = 1;
        const allLayers = this.getAllLayersRecursively();
        while (allLayers.some((layer) => layer.getName() === potentialName)) {
            potentialName = `${name} (${i})`;
            i++;
        }
        return potentialName;
    }

    private makeUniqueGroupName(name: string): string {
        let potentialName = name;
        let i = 1;
        const allGroups = this.getAllGroups();
        while (allGroups.some((group) => group.getName() === potentialName)) {
            potentialName = `${name} (${i})`;
            i++;
        }
        return potentialName;
    }

    makeSubscriberFunction(topic: LayerManagerTopic): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const subscribers = this._subscribers.get(topic) || new Set();
            subscribers.add(onStoreChangeCallback);
            this._subscribers.set(topic, subscribers);

            return () => {
                subscribers.delete(onStoreChangeCallback);
            };
        };

        return subscriber;
    }

    makeSnapshotGetter<T extends LayerManagerTopic>(topic: T): () => LayerManagerTopicValueTypes[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerManagerTopic.ITEMS_CHANGED) {
                return this._items;
            }
            if (topic === LayerManagerTopic.LAYERS_CHANGED_RECURSIVELY) {
                return this._allLayers;
            }
            if (topic === LayerManagerTopic.SETTINGS_CHANGED) {
                return this._settingsIteration;
            }
        };

        return snapshotGetter;
    }
}

export function useLayerManagerTopicValue<T extends LayerManagerTopic>(
    layerManager: LayerManager,
    topic: T
): LayerManagerTopicValueTypes[T] {
    const value = React.useSyncExternalStore<LayerManagerTopicValueTypes[T]>(
        layerManager.makeSubscriberFunction(topic),
        layerManager.makeSnapshotGetter(topic)
    );

    return value;
}
