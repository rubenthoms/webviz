import type { SerializedDockview } from "dockview-react";

import type { CollapsedEdgeState, DockEdge, SettingsPanelLastPosition } from "./SettingsDockController";

const STORED_LAYOUT_VERSION = 6;

export type StoredSettingsDockLayout = {
    version: typeof STORED_LAYOUT_VERSION;
    dockview: SerializedDockview;
    /** Where each closed or floating panel was last docked, so it returns there */
    lastEdges: Partial<Record<string, DockEdge>>;
    /** Where each hidden or closed panel was taken out of a group, so it returns to the same place */
    lastPositions: Record<string, SettingsPanelLastPosition>;
    /** The side of each hidden group, which cannot be derived from a group without size */
    hiddenGroupEdges: Record<string, DockEdge>;
    collapsedEdges: Partial<Record<DockEdge, CollapsedEdgeState>>;
};

export function loadSettingsDockLayout(storageKey: string): StoredSettingsDockLayout | null {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<StoredSettingsDockLayout>;
        if (parsed.version !== STORED_LAYOUT_VERSION || !parsed.dockview) {
            throw new Error(`Unsupported settings layout version: ${parsed.version}`);
        }
        return {
            version: STORED_LAYOUT_VERSION,
            dockview: parsed.dockview,
            lastEdges: parsed.lastEdges ?? {},
            lastPositions: parsed.lastPositions ?? {},
            hiddenGroupEdges: parsed.hiddenGroupEdges ?? {},
            collapsedEdges: parsed.collapsedEdges ?? {},
        };
    } catch (error) {
        console.warn("Discarding invalid stored settings layout", error);
        localStorage.removeItem(storageKey);
        return null;
    }
}

export function saveSettingsDockLayout(
    storageKey: string,
    layout: Omit<StoredSettingsDockLayout, "version">,
): void {
    const stored: StoredSettingsDockLayout = { version: STORED_LAYOUT_VERSION, ...layout };
    localStorage.setItem(storageKey, JSON.stringify(stored));
}
