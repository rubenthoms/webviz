import React from "react";

import { v4 } from "uuid";

import { BaseLayer } from "./BaseLayer";

export enum LayerGroupTopic {
    NAME_CHANGED = "name-changed",
    LAYERS_CHANGED = "layer-ids-changed",
    VISIBILITY_CHANGED = "visibility-changed",
}

export type LayerGroupTopicValueTypes = {
    [LayerGroupTopic.LAYERS_CHANGED]: string[];
    [LayerGroupTopic.NAME_CHANGED]: string;
    [LayerGroupTopic.VISIBILITY_CHANGED]: boolean;
};

export class LayerGroup {
    private _id: string;
    private _name: string;
    private _subscribers: Map<LayerGroupTopic, Set<() => void>> = new Map();
    private _layers: BaseLayer<any, any>[] = [];
    private _isVisible: boolean = true;

    constructor(name: string) {
        this._id = v4();
        this._name = name;
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

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
        this.notifySubscribers(LayerGroupTopic.NAME_CHANGED);
    }

    getLayer(id: string): BaseLayer<any, any> | undefined {
        return this._layers.find((layer) => layer.getId() === id);
    }

    getLayers(): BaseLayer<any, any>[] {
        return this._layers;
    }

    addLayer(layer: BaseLayer<any, any>): void {
        this._layers = [...this._layers, layer];
        this.notifySubscribers(LayerGroupTopic.LAYERS_CHANGED);
    }

    removeLayer(id: string): void {
        this._layers = this._layers.filter((layer) => layer.getId() !== id);
        this.notifySubscribers(LayerGroupTopic.LAYERS_CHANGED);
    }

    moveLayer(id: string, position: number): void {
        const layer = this._layers.find((layer) => layer.getId() === id);
        if (!layer) {
            throw new Error(`Layer with id ${id} not found`);
        }

        const layers = this._layers.filter((layer) => layer.getId() !== id);
        layers.splice(position, 0, layer);

        this._layers = layers;
        this.notifySubscribers(LayerGroupTopic.LAYERS_CHANGED);
    }

    insertLayer(layer: BaseLayer<any, any>, position: number): void {
        const layers = [...this._layers];
        layers.splice(position, 0, layer);
        this._layers = layers;
        this.notifySubscribers(LayerGroupTopic.LAYERS_CHANGED);
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
            if (topic === LayerGroupTopic.LAYERS_CHANGED) {
                return this.getLayers().map((layer) => layer.getId());
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
