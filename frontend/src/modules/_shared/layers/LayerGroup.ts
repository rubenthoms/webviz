import React from "react";

import { v4 } from "uuid";

import { LayerItem, LayerManager } from "./LayerManager";

export enum LayerGroupTopic {
    NAME_CHANGED = "name-changed",
    ITEMS_CHANGED = "items-changed",
    VISIBILITY_CHANGED = "visibility-changed",
}

export type LayerGroupTopicValueTypes = {
    [LayerGroupTopic.ITEMS_CHANGED]: void;
    [LayerGroupTopic.NAME_CHANGED]: string;
    [LayerGroupTopic.VISIBILITY_CHANGED]: boolean;
};

export class LayerGroup {
    private _id: string;
    private _name: string;
    private _layerManager: LayerManager;

    private _subscribers: Map<LayerGroupTopic, Set<() => void>> = new Map();
    private _childrenIds: string[] = [];

    private _isVisible: boolean = true;
    private _isExpanded: boolean = true;

    constructor(name: string, layerManager: LayerManager) {
        this._id = v4();
        this._name = name;
        this._layerManager = layerManager;
    }

    getId(): string {
        return this._id;
    }

    getIsVisible(): boolean {
        return this._isVisible;
    }

    setIsVisible(isVisible: boolean): void {
        this._isVisible = isVisible;
        this.notifySubscribers(LayerGroupTopic.VISIBILITY_CHANGED);
    }

    getIsExpanded(): boolean {
        return this._isExpanded;
    }

    setIsExpanded(isExpanded: boolean): void {
        this._isExpanded = isExpanded;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
        this.notifySubscribers(LayerGroupTopic.NAME_CHANGED);
    }

    getItem(id: string): LayerItem | undefined {
        if (this._childrenIds.includes(id)) {
            return this._layerManager.getItem(id);
        }
        return undefined;
    }

    getItems(): LayerItem[] {
        const items: LayerItem[] = [];
        for (const id of this._childrenIds) {
            const item = this._layerManager.getItem(id);
            if (item) {
                items.push(item);
            }
        }
        return items;
    }

    prependItem(item: LayerItem): void {
        this._childrenIds = [item.getId(), ...this._childrenIds];
        this._layerManager.addItem(item);
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    appendItem(item: LayerItem): void {
        this._childrenIds = [...this._childrenIds, item.getId()];
        this._layerManager.addItem(item);
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    insertItem(item: LayerItem, position: number): void {
        const items = [...this._childrenIds];
        items.splice(position, 0, item.getId());
        this._childrenIds = items;
        this._layerManager.addItem(item);
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    moveItem(id: string, position: number): void {
        const item = this._childrenIds.find((childId) => childId === id);
        if (!item) {
            throw new Error(`Child with id ${id} not found`);
        }

        const items = this._childrenIds.filter((childId) => childId !== id);
        items.splice(position, 0, item);

        this._childrenIds = items;
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    removeItem(id: string): void {
        this._childrenIds = this._childrenIds.filter((childId) => childId !== id);
        this._layerManager.removeItem(id);
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    subscribe(topic: LayerGroupTopic, subscriber: () => void): void {
        const subscribers = this._subscribers.get(topic) ?? new Set();
        subscribers.add(subscriber);
        this._subscribers.set(topic, subscribers);
    }

    private notifySubscribers(topic: LayerGroupTopic): void {
        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    makeSubscriberFunction(topic: LayerGroupTopic): (onStoreChangeCallback: () => void) => () => void {
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

    makeSnapshotGetter<T extends LayerGroupTopic>(topic: T): () => LayerGroupTopicValueTypes[T] {
        const snapshotGetter = (): any => {
            if (topic === LayerGroupTopic.NAME_CHANGED) {
                return this.getName();
            }
            if (topic === LayerGroupTopic.ITEMS_CHANGED) {
                return this._childrenIds;
            }
            if (topic === LayerGroupTopic.VISIBILITY_CHANGED) {
                return this.getIsVisible();
            }
        };

        return snapshotGetter;
    }
}

export function useLayerGroupTopicValue<T extends LayerGroupTopic>(
    layerGroup: LayerGroup,
    topic: T
): LayerGroupTopicValueTypes[T] {
    const value = React.useSyncExternalStore<LayerGroupTopicValueTypes[T]>(
        layerGroup.makeSubscriberFunction(topic),
        layerGroup.makeSnapshotGetter(topic)
    );

    return value;
}
