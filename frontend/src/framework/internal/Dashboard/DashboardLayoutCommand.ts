import type { UndoCommand } from "../UndoRedo/UndoRedoManager";

import type { Dashboard } from "./Dashboard";
import type { DashboardLayoutHistoryState } from "./types";

export class DashboardLayoutCommand implements UndoCommand {
    label = "Dashboard layout";

    constructor(
        private readonly dashboard: Dashboard,
        private readonly before: DashboardLayoutHistoryState,
        private readonly after: DashboardLayoutHistoryState,
        private readonly ts: number = Date.now(),
    ) {}

    undo(): void {
        this.dashboard.applyLayoutFromHistory(this.before);
    }

    redo(): void {
        this.dashboard.applyLayoutFromHistory(this.after);
    }

    merge(next: UndoCommand): UndoCommand | null {
        if (!(next instanceof DashboardLayoutCommand)) return null;
        if (next.dashboard !== this.dashboard) return null;

        // Merge drag/resize bursts
        const MERGE_MS = 400;
        if (next.ts - this.ts > MERGE_MS) return null;

        return new DashboardLayoutCommand(this.dashboard, this.before, next.after, next.ts);
    }
}
