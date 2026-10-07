import React from "react";

import type { ModuleInstance } from "./ModuleInstance";

/**
 * Normalized domain key of a selectable object. Renderer-specific pick objects (deck.gl, Plotly, ...)
 * must be converted to one of these before entering the selection.
 */
export type SelectionItem = {
    readonly kind: "polyline";
    /** IntersectionPolyline.id from the session's UserCreatedItems */
    readonly id: string;
};

export type SelectionSnapshot = {
    /** Owner of the current selection. Null iff the selection is empty. */
    readonly sourceModuleInstance: ModuleInstance<any, any> | null;
    /** Selected items in selection order. */
    readonly items: readonly SelectionItem[];
    /** Where the current selection started. Null iff the selection is empty. Always one of `items`. */
    readonly anchorItem: SelectionItem | null;
    /** Selected item that has focus, usually the most recently selected. Null iff the selection is empty. */
    readonly currentItem: SelectionItem | null;
};

export interface SelectionReader {
    /** Returns the same object reference until the selection changes. */
    getSnapshot(): SelectionSnapshot;
    /** Stable subscription function, suitable for `useSyncExternalStore`. */
    subscribe(listener: () => void): () => void;
}

/**
 * Editor bound to one module instance, which is the implicit source of every operation. Operations
 * that would modify another module's selection are no-ops, except those starting a new selection.
 */
export interface SelectionEditor {
    /** Starts a new selection owned by this module. Empty `items` clears (if this module owns the selection). */
    replace(items: readonly SelectionItem[], currentItem?: SelectionItem): void;
    /** Extends this module's selection, or starts a new one if another module owns it. */
    add(items: readonly SelectionItem[]): void;
    /** Deselects items. No-op if this module does not own the selection. */
    remove(items: readonly SelectionItem[]): void;
    /** Removes the item if this module has it selected, otherwise adds it. */
    toggle(item: SelectionItem): void;
    /** Moves focus within the selection. No-op if this module does not own the selection. */
    setCurrentItem(item: SelectionItem): void;
    /** Clears the selection if this module owns it. */
    clear(): void;
}

export function makeSelectionItemKey(item: SelectionItem): string {
    return `${item.kind}:${item.id}`;
}

export function isSameSelectionItem(a: SelectionItem | null, b: SelectionItem | null): boolean {
    if (a === null || b === null) {
        return a === b;
    }
    return makeSelectionItemKey(a) === makeSelectionItemKey(b);
}

export type ModuleSelectionContextValue = {
    readonly reader: SelectionReader;
    readonly editor: SelectionEditor;
};

export const ModuleSelectionContext = React.createContext<ModuleSelectionContextValue | null>(null);

function useModuleSelectionContext(): ModuleSelectionContextValue {
    const value = React.useContext(ModuleSelectionContext);
    if (!value) {
        throw new Error("Selection hooks must be used within a module's settings or view");
    }
    return value;
}

/**
 * Returns the current selection of the dashboard this module belongs to.
 */
export function useSelection(): SelectionSnapshot {
    const { reader } = useModuleSelectionContext();
    return React.useSyncExternalStore(reader.subscribe, reader.getSnapshot, reader.getSnapshot);
}

/**
 * Returns the selection editor bound to this module instance.
 */
export function useSelectionEditor(): SelectionEditor {
    return useModuleSelectionContext().editor;
}
