import React from "react";

import { BaseItem, Message, MessageDirection, MessageType } from "./BaseItem";
import { BaseSetting } from "./settings/BaseSetting";
import { SettingType } from "./settings/SettingTypes";

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

export class LayerGroup extends BaseItem {
    private _subscribers: Map<LayerGroupTopic, Set<() => void>> = new Map();
    private _snapshot: BaseItem[] = [];
    private _isVisible: boolean = true;
    private _isExpanded: boolean = true;

    constructor(name: string, parent?: BaseItem) {
        super(name, parent);
    }

    getAllDescendantsRecursively(): BaseItem[] {
        return this.getAllDescendants();
    }

    getAllEffectiveSettings(): BaseSetting<any>[] {
        const settings: BaseSetting<any>[] = [];
        const visitedSettings: SettingType[] = [];

        const items = this.getAncestorsAndSiblings();
        for (const item of items) {
            if (item instanceof BaseSetting) {
                const setting = item as BaseSetting<any>;
                if (visitedSettings.includes(setting.getType())) {
                    continue;
                }
                visitedSettings.push(setting.getType());
                settings.push(item);
            }
        }

        return settings;
    }

    handleMessage(message: Message): void {
        if (
            message.type === MessageType.CHANGED &&
            message.origin instanceof BaseSetting &&
            message.direction === MessageDirection.UP
        ) {
            message.stopPropagation();
            const newMessage = message.clone();
            newMessage.direction = MessageDirection.DOWN;
            this.emitMessage(newMessage);
        }
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

    setName(name: string): void {
        super.setName(name);
        this.notifySubscribers(LayerGroupTopic.NAME_CHANGED);
    }

    getSubGroup(id: string): LayerGroup | null {
        const descendant = this.getDescendant(id);
        if (descendant instanceof LayerGroup) {
            return descendant;
        }
        return null;
    }

    getItem(id: string): BaseItem | null {
        return this.getDescendant(id) ?? null;
    }

    getItems(): BaseItem[] {
        return this.getChildren();
    }

    private makeSnapshot() {
        this._snapshot = this.getAllDescendants();
    }

    getSnapshot(): BaseItem[] {
        return this._snapshot;
    }

    prependItem(item: BaseItem): void {
        this.prependChild(item);
        this.makeSnapshot();
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    appendItem(item: BaseItem): void {
        this.appendChild(item);
        this.makeSnapshot();
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    insertItem(item: BaseItem, position: number): void {
        this.insertChild(item, position);
        this.makeSnapshot();
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    moveItem(id: string, position: number): void {
        const item = this.getChild(id);
        if (!item) {
            throw new Error(`Child with id ${id} not found`);
        }

        const items = this.getChildren().filter((child) => child.getId() !== id);
        items.splice(position, 0, item);

        this.setChildren(items);
        this.notifySubscribers(LayerGroupTopic.ITEMS_CHANGED);
    }

    removeItem(id: string): void {
        this.removeChild(id);
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
                return this._snapshot;
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
