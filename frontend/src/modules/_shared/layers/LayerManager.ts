import React from "react";

import { QueryClient } from "@tanstack/query-core";

import { BaseItem } from "./BaseItem";
import { BaseLayer } from "./BaseLayer";
import { LayerGroup, LayerGroupTopic } from "./LayerGroup";
import { BaseSetting } from "./settings/BaseSetting";

export enum LayerManagerTopic {
    ITEMS_CHANGED = "items-changed",
}

export type LayerManagerTopicValueTypes = {
    [LayerManagerTopic.ITEMS_CHANGED]: BaseItem[];
};

export type LayerItem = BaseLayer<any, any> | LayerGroup | BaseSetting<any>;

export class LayerManager {
    private _queryClient: QueryClient | null = null;
    private _subscribers: Map<LayerManagerTopic, Set<() => void>> = new Map();
    private _mainGroup: LayerGroup = new LayerGroup("Main");

    constructor() {
        this._mainGroup.subscribe(LayerGroupTopic.ITEMS_CHANGED, () => {
            this.notifySubscribers(LayerManagerTopic.ITEMS_CHANGED);
        });
    }

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
        while (this._mainGroup.getAllDescendantsRecursively().some((item) => item.getName() === potentialName)) {
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
                return this._mainGroup.getSnapshot();
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
