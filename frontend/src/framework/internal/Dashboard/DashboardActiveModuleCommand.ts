import type { UndoCommand } from "../UndoRedo/UndoRedoManager";

import type { Dashboard } from "./Dashboard";
import type { DashboardActiveModuleHistoryState } from "./types";

export class DashboardActiveModuleCommand implements UndoCommand {
    label = "Change active module";

    constructor(
        private readonly dashboard: Dashboard,
        private readonly before: DashboardActiveModuleHistoryState,
        private readonly after: DashboardActiveModuleHistoryState,
    ) {}

    undo(): void {
        this.dashboard.applyActiveModuleInstanceIdFromHistory(this.before);
    }

    redo(): void {
        this.dashboard.applyActiveModuleInstanceIdFromHistory(this.after);
    }
}
