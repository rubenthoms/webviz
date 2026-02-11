import type { UndoCommand } from "../UndoRedo/UndoRedoManager";

import type { Dashboard } from "./Dashboard";
import { composeLayoutPatches } from "./helpers";
import type { LayoutPatch } from "./types";

export class DashboardLayoutPatchCommand implements UndoCommand {
    private _label = "Dashboard layout";
    private _dashboard: Dashboard;
    private _patch: LayoutPatch;

    constructor(dashboard: Dashboard, patch: LayoutPatch) {
        this._dashboard = dashboard;
        this._patch = patch;
    }

    getLabel() {
        return this._label;
    }

    undo() {
        this._dashboard.applyLayoutPatchBackward(this._patch);
    }

    redo() {
        this._dashboard.applyLayoutPatchForward(this._patch);
    }

    merge(next: UndoCommand): UndoCommand | null {
        // Only merge same command type
        if (!(next instanceof DashboardLayoutPatchCommand)) return null;

        // Only merge patches targeting the same dashboard instance
        if (next._dashboard !== this._dashboard) return null;

        const mergedPatch = composeLayoutPatches(this._patch, next._patch);
        if (!mergedPatch) return null;

        return new DashboardLayoutPatchCommand(this._dashboard, mergedPatch);
    }
}
