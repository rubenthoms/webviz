import React from "react";

import { v4 } from "uuid";

export enum LayerGroupTopic {
    NAME_CHANGED = "name-changed",
    LAYER_IDS_CHANGED = "layer-ids-changed",
}

export type LayerGroupTopicValueTypes = {
    [LayerGroupTopic.LAYER_IDS_CHANGED]: string[];
    [LayerGroupTopic.NAME_CHANGED]: string;
};

export class LayerGroup {
    private _id: string;
    private _name: string;
    private _subscribers: Map<LayerGroupTopic, Set<() => void>> = new Map();

    constructor(name: string) {
        this._id = v4();
        this._name = name;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
        this.notifySubscribers(LayerGroupTopic.NAME_CHANGED);
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
