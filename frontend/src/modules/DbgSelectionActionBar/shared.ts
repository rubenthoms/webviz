import type { ActionBarTabMetadata } from "@framework/ActionBar";
import type { SelectionItem, SelectionSnapshot } from "@framework/Selection";
import { makeSelectionItemKey } from "@framework/Selection";

export type Interfaces = {
    settingsToView: Record<string, never>;
    viewToSettings: Record<string, never>;
};

// Fake polyline ids - the prototype does not use the session's intersection polylines
export const MOCK_ITEMS: readonly SelectionItem[] = ["A", "B", "C", "D", "E"].map((id) => ({ kind: "polyline", id }));

export const POLYLINE_TAB: ActionBarTabMetadata = {
    id: "polyline",
    label: "Polyline",
    order: 100,
    contextual: true,
};

export function isOwnSelection(snapshot: SelectionSnapshot, moduleInstanceId: string): boolean {
    return snapshot.sourceModuleInstance?.getId() === moduleInstanceId;
}

export function getActivationKey(snapshot: SelectionSnapshot): string | undefined {
    return snapshot.anchorItem ? makeSelectionItemKey(snapshot.anchorItem) : undefined;
}
