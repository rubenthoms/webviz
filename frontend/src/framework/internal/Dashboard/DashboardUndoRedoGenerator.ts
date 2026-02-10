import type {
    UndoRedoGeneratorContext,
    UndoRedoGeneratorImpl,
    UndoRedoGeneratorTools,
} from "../UndoRedo/UndoRedoGenerator";

import { DashboardTopic, type Dashboard } from "./Dashboard";
import { DashboardActiveModuleCommand } from "./DashboardActiveModuleCommand";
import { DashboardLayoutCommand } from "./DashboardLayoutCommand";
import type { DashboardActiveModuleHistoryState, DashboardLayoutHistoryState } from "./types";

export class DashboardUndoRedoGeneratorImpl implements UndoRedoGeneratorImpl {
    private _dashboard: Dashboard;
    private _layoutBaseline: DashboardLayoutHistoryState | null = null;
    private _activeBaseline: DashboardActiveModuleHistoryState | null = null;

    private _layoutDebounce: ReturnType<typeof setTimeout> | null = null;

    constructor(dashboard: Dashboard) {
        this._dashboard = dashboard;
    }

    onAttach(context: UndoRedoGeneratorContext, tools: UndoRedoGeneratorTools) {
        // Prime baselines
        this._layoutBaseline = this.captureLayout();
        this._activeBaseline = this.captureActive();

        // Layout changes (includes add/remove *if* those update layout)
        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-layout`,
            this._dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.LAYOUT)(() => {
                if (tools.isPaused() || context.isReplaying()) return;

                if (this._layoutDebounce) clearTimeout(this._layoutDebounce);
                this._layoutDebounce = setTimeout(() => {
                    this._layoutDebounce = null;
                    this.maybePushLayout(tools.push.bind(tools));
                }, 150);
            }),
        );

        // Active module changes (no debounce)
        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-active`,
            this._dashboard
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DashboardTopic.ACTIVE_MODULE_INSTANCE_ID)(() => {
                if (tools.isPaused() || context.isReplaying()) return;
                this.maybePushActive(tools.push.bind(tools));
            }),
        );

        // Optional: if you later discover module add/remove can happen before layout is updated,
        // you can also subscribe to MODULE_INSTANCES to trigger maybePushLayout.
        // (Often not needed if layout is updated as part of add/remove.)
    }

    onDetach() {
        if (this._layoutDebounce) {
            clearTimeout(this._layoutDebounce);
            this._layoutDebounce = null;
        }
    }

    private captureLayout(): DashboardLayoutHistoryState {
        // IMPORTANT: copy elements so future mutations don’t mutate baseline
        const layout = this._dashboard.getLayout().map((el) => ({ ...el }));
        return { layout };
    }

    private captureActive(): DashboardActiveModuleHistoryState {
        return { activeModuleInstanceId: this._dashboard.getActiveModuleInstanceId() };
    }

    private maybePushLayout(push: (cmd: any) => void) {
        const next = this.captureLayout();
        if (!this._layoutBaseline) {
            this._layoutBaseline = next;
            return;
        }

        // Cheap compare: if same length and all elements equal => skip
        if (isSameLayout(this._layoutBaseline.layout, next.layout)) return;

        push(new DashboardLayoutCommand(this._dashboard, this._layoutBaseline, next));
        this._layoutBaseline = next;
    }

    private maybePushActive(push: (cmd: any) => void) {
        const next = this.captureActive();
        if (!this._activeBaseline) {
            this._activeBaseline = next;
            return;
        }
        if (this._activeBaseline.activeModuleInstanceId === next.activeModuleInstanceId) return;

        push(new DashboardActiveModuleCommand(this._dashboard, this._activeBaseline, next));
        this._activeBaseline = next;
    }
}

function isSameLayout(a: any[], b: any[]): boolean {
    if (a === b) return true;
    if (a.length !== b.length) return false;

    for (let i = 0; i < a.length; i++) {
        const x = a[i]!;
        const y = b[i]!;
        if (
            x.moduleInstanceId !== y.moduleInstanceId ||
            x.moduleName !== y.moduleName ||
            x.relX !== y.relX ||
            x.relY !== y.relY ||
            x.relWidth !== y.relWidth ||
            x.relHeight !== y.relHeight ||
            (x.minimized ?? false) !== (y.minimized ?? false) ||
            (x.maximized ?? false) !== (y.maximized ?? false)
        ) {
            return false;
        }
    }
    return true;
}
