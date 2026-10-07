import type { ModuleInstance } from "@framework/ModuleInstance";
import type { SelectionEditor, SelectionItem, SelectionReader, SelectionSnapshot } from "@framework/Selection";
import { isSameSelectionItem, makeSelectionItemKey } from "@framework/Selection";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

enum SelectionServiceTopic {
    SELECTION = "selection",
}

type SelectionServiceTopicPayloads = {
    [SelectionServiceTopic.SELECTION]: void;
};

const EMPTY_SELECTION: SelectionSnapshot = Object.freeze({
    sourceModuleInstance: null,
    items: Object.freeze([]),
    anchorItem: null,
    currentItem: null,
});

/**
 * Framework-internal operations, used by owners of module lifecycle and data validity.
 */
export interface SelectionInvalidator {
    /**
     * Clears the selection if `source` owns it, and makes `source`'s editor inert so late callbacks
     * cannot create a selection owned by a torn-down instance.
     */
    releaseSource(source: ModuleInstance<any, any>): void;

    /** Removes every item matching the predicate, regardless of source. */
    removeItemsWhere(predicate: (item: SelectionItem) => boolean): void;
}

function dedupeItems(items: readonly SelectionItem[]): SelectionItem[] {
    const seenKeys = new Set<string>();
    const result: SelectionItem[] = [];
    for (const item of items) {
        const key = makeSelectionItemKey(item);
        if (!seenKeys.has(key)) {
            seenKeys.add(key);
            result.push(item);
        }
    }
    return result;
}

function containsItem(items: readonly SelectionItem[], item: SelectionItem): boolean {
    return items.some((el) => isSameSelectionItem(el, item));
}

/**
 * Per-dashboard selection. Module code only ever receives the reader facet and the editor bound to
 * its own instance (via `ModuleSelectionContext`); the invalidator facet stays framework-internal.
 */
export class DashboardSelectionService implements SelectionReader, SelectionInvalidator {
    private _snapshot: SelectionSnapshot = EMPTY_SELECTION;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<SelectionServiceTopicPayloads>();
    private _editors = new WeakMap<ModuleInstance<any, any>, SelectionEditor>();
    private _releasedSources = new WeakSet<ModuleInstance<any, any>>();

    // Arrow functions to keep stable identities for useSyncExternalStore
    readonly getSnapshot = (): SelectionSnapshot => {
        return this._snapshot;
    };

    readonly subscribe = (listener: () => void): (() => void) => {
        return this._publishSubscribeDelegate.subscribe(SelectionServiceTopic.SELECTION, listener);
    };

    /**
     * Returns the editor bound to `source` - the same object for the same instance.
     */
    getEditor(source: ModuleInstance<any, any>): SelectionEditor {
        let editor = this._editors.get(source);
        if (!editor) {
            editor = this.makeEditor(source);
            this._editors.set(source, editor);
        }
        return editor;
    }

    releaseSource(source: ModuleInstance<any, any>): void {
        this._releasedSources.add(source);
        if (this.isOwner(source)) {
            this.setSnapshot(EMPTY_SELECTION);
        }
    }

    removeItemsWhere(predicate: (item: SelectionItem) => boolean): void {
        const remainingItems = this._snapshot.items.filter((item) => !predicate(item));
        this.applyRemaining(remainingItems);
    }

    private makeEditor(source: ModuleInstance<any, any>): SelectionEditor {
        const guard = <TArgs extends unknown[]>(operation: (...args: TArgs) => void) => {
            return (...args: TArgs): void => {
                if (this._releasedSources.has(source)) {
                    console.warn(`Ignoring selection change from released module instance "${source.getTitle()}"`);
                    return;
                }
                operation(...args);
            };
        };

        return {
            replace: guard((items: readonly SelectionItem[], currentItem?: SelectionItem) =>
                this.replace(source, items, currentItem),
            ),
            add: guard((items: readonly SelectionItem[]) => this.add(source, items)),
            remove: guard((items: readonly SelectionItem[]) => this.remove(source, items)),
            toggle: guard((item: SelectionItem) => this.toggle(source, item)),
            setCurrentItem: guard((item: SelectionItem) => this.setCurrentItem(source, item)),
            clear: guard(() => this.clear(source)),
        };
    }

    private isOwner(source: ModuleInstance<any, any>): boolean {
        return this._snapshot.sourceModuleInstance === source;
    }

    private replace(
        source: ModuleInstance<any, any>,
        items: readonly SelectionItem[],
        currentItem?: SelectionItem,
    ): void {
        const newItems = dedupeItems(items);
        if (newItems.length === 0) {
            this.clear(source);
            return;
        }

        if (currentItem && !containsItem(newItems, currentItem)) {
            throw new Error("The current item must be one of the selected items");
        }

        this.commit(source, newItems, newItems[0], currentItem ?? newItems[newItems.length - 1]);
    }

    private add(source: ModuleInstance<any, any>, items: readonly SelectionItem[]): void {
        if (!this.isOwner(source)) {
            this.replace(source, items);
            return;
        }

        const addedItems = dedupeItems(items);
        if (addedItems.length === 0) {
            return;
        }

        const newItems = dedupeItems([...this._snapshot.items, ...addedItems]);
        this.commit(source, newItems, this._snapshot.anchorItem!, addedItems[addedItems.length - 1]);
    }

    private remove(source: ModuleInstance<any, any>, items: readonly SelectionItem[]): void {
        if (!this.isOwner(source)) {
            return;
        }

        const remainingItems = this._snapshot.items.filter((item) => !containsItem(items, item));
        this.applyRemaining(remainingItems);
    }

    private toggle(source: ModuleInstance<any, any>, item: SelectionItem): void {
        if (this.isOwner(source) && containsItem(this._snapshot.items, item)) {
            this.remove(source, [item]);
            return;
        }
        this.add(source, [item]);
    }

    private setCurrentItem(source: ModuleInstance<any, any>, item: SelectionItem): void {
        if (!this.isOwner(source)) {
            return;
        }

        if (!containsItem(this._snapshot.items, item)) {
            throw new Error("The current item must be one of the selected items");
        }

        this.commit(source, this._snapshot.items, this._snapshot.anchorItem!, item);
    }

    private clear(source: ModuleInstance<any, any>): void {
        if (this.isOwner(source)) {
            this.setSnapshot(EMPTY_SELECTION);
        }
    }

    /**
     * Applies a removal while keeping the current source; anchor/current fall back to the first/last
     * remaining item if they were removed.
     */
    private applyRemaining(remainingItems: SelectionItem[]): void {
        const source = this._snapshot.sourceModuleInstance;
        if (!source || remainingItems.length === this._snapshot.items.length) {
            return;
        }

        if (remainingItems.length === 0) {
            this.setSnapshot(EMPTY_SELECTION);
            return;
        }

        const { anchorItem, currentItem } = this._snapshot;
        const newAnchorItem = anchorItem && containsItem(remainingItems, anchorItem) ? anchorItem : remainingItems[0];
        const newCurrentItem =
            currentItem && containsItem(remainingItems, currentItem)
                ? currentItem
                : remainingItems[remainingItems.length - 1];

        this.commit(source, remainingItems, newAnchorItem, newCurrentItem);
    }

    private commit(
        source: ModuleInstance<any, any>,
        items: readonly SelectionItem[],
        anchorItem: SelectionItem,
        currentItem: SelectionItem,
    ): void {
        const current = this._snapshot;
        const isUnchanged =
            current.sourceModuleInstance === source &&
            current.items.length === items.length &&
            current.items.every((item, index) => isSameSelectionItem(item, items[index])) &&
            isSameSelectionItem(current.anchorItem, anchorItem) &&
            isSameSelectionItem(current.currentItem, currentItem);

        if (isUnchanged) {
            return;
        }

        this.setSnapshot(
            Object.freeze({
                sourceModuleInstance: source,
                items: Object.freeze([...items]),
                anchorItem,
                currentItem,
            }),
        );
    }

    private setSnapshot(snapshot: SelectionSnapshot): void {
        if (snapshot === this._snapshot) {
            return;
        }
        this._snapshot = snapshot;
        this._publishSubscribeDelegate.notifySubscribers(SelectionServiceTopic.SELECTION);
    }
}
