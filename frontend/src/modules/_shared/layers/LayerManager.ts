import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { BaseLayer } from "./BaseLayer";
import { LayerGroup } from "./LayerGroup";
import { BaseSetting } from "./settings/BaseSetting";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
}

export type LayerManagerTopicValueTypes = {
    [LayerManagerTopic.ITEMS_CHANGED]: LayerItem[];
};

export type LayerItem = BaseLayer<any, any> | LayerGroup | BaseSetting<any>;

export class LayerManager {
    private _queryClient: QueryClient | null = null;
    private _subscribers: Map<LayerManagerTopic, Set<() => void>> = new Map();
    private _items: LayerItem[] = [];

    private _mainGroup: LayerGroup = new LayerGroup("Main", this);

    setQueryClient(queryClient: QueryClient): void {
        this._queryClient = queryClient;
    }

    getQueryClient(): QueryClient {
        if (!this._queryClient) {
            throw new Error("Query client not set");
        }
        return this._queryClient;
    }

    getMainGroup(): LayerGroup {
        return this._mainGroup;
    }

    addItem(item: LayerItem) {
        if (item instanceof LayerGroup || item instanceof BaseLayer) {
            item.setName(this.makeUniqueName(item.getName()));
        }
        this._items = [...this._items, item];
        this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
    }

    getItem(id: string): LayerItem | undefined {
        return this._items.find((item) => item.getId() === id);
    }

    removeItem(id: string): void {
        this._items = this._items.filter((item) => item.getId() !== id);
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

    makeUniqueName(name: string): string {
        let potentialName = name;
        let i = 1;
        while (this._items.some((item) => item.getName() === potentialName)) {
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
