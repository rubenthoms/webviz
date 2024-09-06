import React from "react";

import { v4 } from "uuid";

import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { Item, instanceofGroup } from "./interfaces";

export enum GroupBaseTopic {
    CHILDREN_CHANGED = "CHILDREN_CHANGED",
}

export type GroupBaseTopicPayloads = {
    [GroupBaseTopic.CHILDREN_CHANGED]: Item[];
};

export class GroupHandler implements Item, PublishSubscribe<GroupBaseTopic, GroupBaseTopicPayloads> {
    private _children: Item[] = [];
    private _id: string;
    private _publishSubscribeHandler = new PublishSubscribeHandler<GroupBaseTopic>();

    constructor() {
        this._id = v4();
    }

    getId() {
        return this._id;
    }

    prependChild(child: Item) {
        this._children = [child, ...this._children];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    appendChild(child: Item) {
        this._children = [...this._children, child];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    insertChild(child: Item, index: number) {
        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN_CHANGED);
    }

    removeChild(child: Item) {
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
                const descendant = child.getGroupHandler().findDescendantById(id);
                if (descendant) {
                    return descendant;
                }
            }
        }

        return undefined;
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
    layerGroup: GroupHandler,
    topic: T
): GroupBaseTopicPayloads[T] {
    const value = React.useSyncExternalStore<GroupBaseTopicPayloads[T]>(
        layerGroup.makeSubscriberFunction(topic),
        layerGroup.makeSnapshotGetter(topic)
    );

    return value;
}
