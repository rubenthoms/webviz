import { v4 } from "uuid";

import { LayerManager, LayerManagerTopic } from "./LayerManager";
import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { SharedSetting } from "./SharedSetting";
import { Item, instanceofGroup, instanceofLayer } from "./interfaces";

export enum GroupBaseTopic {
    CHILDREN = "CHILDREN",
    VISIBILITY = "VISIBILITY",
}

export type GroupBaseTopicPayloads = {
    [GroupBaseTopic.CHILDREN]: Item[];
    [GroupBaseTopic.VISIBILITY]: boolean;
};

export class GroupDelegate implements Item, PublishSubscribe<GroupBaseTopic, GroupBaseTopicPayloads> {
    private _parentGroup: GroupDelegate | null = null;
    private _children: Item[] = [];
    private _id: string;
    private _visible: boolean = true;
    private _manager: LayerManager | null = null;
    private _publishSubscribeHandler = new PublishSubscribeHandler<GroupBaseTopic>();

    constructor(manager: LayerManager | null) {
        this._id = v4();
        this._manager = manager;
    }

    getId() {
        return this._id;
    }

    isVisible() {
        return this._visible;
    }

    setVisibility(visible: boolean) {
        this._visible = visible;
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.VISIBILITY);
    }

    setParentGroup(parentGroup: GroupDelegate | null) {
        this._parentGroup = parentGroup;
    }

    setLayerManager(manager: LayerManager | null) {
        this._manager = manager;
    }

    private takeOwnershipOfChild(child: Item) {
        if (instanceofLayer(child)) {
            child.getDelegate().setParentGroup(this);
            child.getDelegate().setLayerManager(this._manager);
        }
        if (child instanceof SharedSetting) {
            child.setLayerManager(this._manager);
            child.setParentGroup(this);
        }
        if (instanceofGroup(child)) {
            child.getGroupDelegate().setParentGroup(this);
            child.getGroupDelegate().setLayerManager(this._manager);
        }

        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
        this.notifyManagerOfItemChange();
    }

    private disposeOwnershipOfChild(child: Item) {
        if (instanceofLayer(child)) {
            child.getDelegate().setParentGroup(null);
            child.getDelegate().setLayerManager(null);
        }
        if (child instanceof SharedSetting) {
            child.setLayerManager(null);
            child.setParentGroup(null);
        }
        if (instanceofGroup(child)) {
            child.getGroupDelegate().setParentGroup(this);
            child.getGroupDelegate().setLayerManager(this._manager);
        }
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
        this.notifyManagerOfItemChange();
    }

    private notifyManagerOfItemChange() {
        if (!this._manager) {
            return;
        }
        this._manager.publishTopic(LayerManagerTopic.ITEMS_CHANGED);
    }

    prependChild(child: Item) {
        this._children = [child, ...this._children];
        this.takeOwnershipOfChild(child);
    }

    appendChild(child: Item) {
        this._children = [...this._children, child];
        this.takeOwnershipOfChild(child);
    }

    insertChild(child: Item, index: number) {
        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this.takeOwnershipOfChild(child);
    }

    removeChild(child: Item) {
        this._children = this._children.filter((c) => c !== child);
        this.disposeOwnershipOfChild(child);
    }

    moveChild(child: Item, index: number) {
        const currentIndex = this._children.indexOf(child);
        if (currentIndex === -1) {
            throw new Error("Child not found");
        }

        this._children = [...this._children.slice(0, currentIndex), ...this._children.slice(currentIndex + 1)];

        this._children = [...this._children.slice(0, index), child, ...this._children.slice(index)];
        this._publishSubscribeHandler.notifySubscribers(GroupBaseTopic.CHILDREN);
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

    getAncestorAndSiblingItems(checkFunc: (item: Item) => boolean): Item[] {
        const items: Item[] = [];
        for (const child of this._children) {
            if (checkFunc(child)) {
                items.push(child);
            }

            if (this._parentGroup) {
                items.push(...this._parentGroup.getAncestorAndSiblingItems(checkFunc));
            }
        }

        return items;
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
            if (topic === GroupBaseTopic.CHILDREN) {
                return this._children;
            }
            if (topic === GroupBaseTopic.VISIBILITY) {
                return this._visible;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<GroupBaseTopic> {
        return this._publishSubscribeHandler;
    }
}
