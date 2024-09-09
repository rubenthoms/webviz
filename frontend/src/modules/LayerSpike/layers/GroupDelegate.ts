import React from "react";

import { v4 } from "uuid";

import { Broker } from "./Broker";
import { LayerManager } from "./LayerManager";
import { Message, MessageDirection, MessageType } from "./Message";
import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { SharedSetting } from "./SharedSetting";
import { Item, instanceofGroup, instanceofLayer } from "./interfaces";

export enum GroupBaseTopic {
    CHILDREN_CHANGED = "CHILDREN_CHANGED",
}

export type GroupBaseTopicPayloads = {
    [GroupBaseTopic.CHILDREN_CHANGED]: Item[];
};

export class GroupDelegate implements Item, PublishSubscribe<GroupBaseTopic, GroupBaseTopicPayloads> {
    private _children: Item[] = [];
    private _id: string;
    private _manager: LayerManager;
    private _broker: Broker;
    private _publishSubscribeHandler = new PublishSubscribeHandler<GroupBaseTopic>();

    constructor(manager: LayerManager) {
        this._id = v4();
        this._broker = new Broker(null);
        this._manager = manager;

        this._broker.onMessage(this.handleBrokerMessage.bind(this));
    }

    private handleBrokerMessage(message: Message) {
        if (message.getType() === MessageType.AVAILABLE_SETTINGS_CHANGED) {
            if (message.getDirection() === MessageDirection.DOWN) {
                message.stopPropagation();
                return;
            }

            this._broker.emit(new Message(MessageType.AVAILABLE_SETTINGS_CHANGED, MessageDirection.DOWN));
        }
    }

    getId() {
        return this._id;
    }

    getBroker() {
        return this._broker;
    }

    private setBrokerAndManagerOfChild(child: Item) {
        child.getBroker().setParent(this._broker);
        this._broker.addChild(child.getBroker());
        if (instanceofLayer(child)) {
            child.getLayerDelegate().setLayerManager(this._manager);
        }
        if (child instanceof SharedSetting) {
            child.setLayerManager(this._manager);
            child.setParentGroup(this);
        }
    }

    private removeBrokerAndManagerOfChild(child: Item) {
        child.getBroker().setParent(null);
        this._broker.removeChild(child.getBroker());
        if (instanceofLayer(child)) {
            child.getLayerDelegate().setLayerManager(null);
        }
    }

    prependChild(child: Item) {
        this.setBrokerAndManagerOfChild(child);
        this._children = [child, ...this._children];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    appendChild(child: Item) {
        this.setBrokerAndManagerOfChild(child);
        this._children = [...this._children, child];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    insertChild(child: Item, index: number) {
        this.setBrokerAndManagerOfChild(child);
        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    removeChild(child: Item) {
        this.removeBrokerAndManagerOfChild(child);
        this._children = this._children.filter((c) => c !== child);
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    moveChild(child: Item, index: number) {
        const currentIndex = this._children.indexOf(child);
        if (currentIndex === -1) {
            throw new Error("Child not found");
        }

        this._children = [...this._children.slice(0, currentIndex), ...this._children.slice(currentIndex + 1)];

        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    getChildren() {
        return this._children;
    }

    findDescendantById(id: string): Item | undefined {
        for (const child of this._children) {
            if (child.getId() === id) {
                return child;
            }

            if (instanceofGroup(child)) {
                const descendant = child.getGroupDelegate().findDescendantById(id);
                if (descendant) {
                    return descendant;
                }
            }
        }

        return undefined;
    }

    getDescendantItems(checkFunc: (item: Item) => boolean): Item[] {
        const items: Item[] = [];
        for (const child of this._children) {
            if (checkFunc(child)) {
                items.push(child);
            }

            if (instanceofGroup(child)) {
                items.push(...child.getGroupDelegate().getDescendantItems(checkFunc));
            }
        }

        return items;
    }

    makeSnapshotGetter<T extends GroupBaseTopic>(topic: T): () => GroupBaseTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === GroupBaseTopic.CHILDREN_CHANGED) {
                return this._children;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: GroupBaseTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }
}

export function useGroupBaseTopicValue<T extends GroupBaseTopic>(
    layerGroup: GroupDelegate,
    topic: T
): GroupBaseTopicPayloads[T] {
    const value = React.useSyncExternalStore<GroupBaseTopicPayloads[T]>(
        layerGroup.makeSubscriberFunction(topic),
        layerGroup.makeSnapshotGetter(topic)
    );

    return value;
}
