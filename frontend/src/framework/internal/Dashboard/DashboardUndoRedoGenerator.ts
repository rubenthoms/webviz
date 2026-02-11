import type { SerializedModuleInstanceState } from "@framework/ModuleInstance.schema";

import type {
    UndoRedoGeneratorContext,
    UndoRedoGeneratorImpl,
    UndoRedoGeneratorTools,
} from "../UndoRedo/UndoRedoGenerator";

import { DashboardTopic, type Dashboard, type LayoutElement } from "./Dashboard";
import { DashboardActiveModuleCommand } from "./DashboardActiveModuleCommand";
import { DashboardLayoutPatchCommand } from "./DashboardLayoutPatchCommand";
import { diffLayout, isEmptyPatch } from "./helpers";
import type { DashboardActiveModuleHistoryState } from "./types";

export type RemovedModuleCache = Map<
    string,
    { moduleState: SerializedModuleInstanceState; layoutBefore: LayoutElement }
>;

export class DashboardUndoRedoGeneratorImpl implements UndoRedoGeneratorImpl {
    private _dashboard: Dashboard;

    private _layoutBaseline: LayoutElement[] | null = null;
    private _activeBaseline: DashboardActiveModuleHistoryState | null = null;

    private _layoutDebounce: ReturnType<typeof setTimeout> | null = null;

    private _removedStateCache: RemovedModuleCache = new Map(); // moduleInstanceId -> state/layout before removal, used to enrich the patch with moduleState for removed instances

    constructor(dashboard: Dashboard) {
        this._dashboard = dashboard;
    }

    onAttach(context: UndoRedoGeneratorContext, tools: UndoRedoGeneratorTools) {
        const isBlocked = () => tools.isPaused() || context.isReplaying();

        // Prime baselines
        this._layoutBaseline = this.captureLayoutOnly();
        this._activeBaseline = this.captureActive();

        const scheduleLayoutCheck = () => {
            if (isBlocked()) return;

            if (this._layoutDebounce) clearTimeout(this._layoutDebounce);
            this._layoutDebounce = setTimeout(() => {
                this._layoutDebounce = null;
                if (isBlocked()) return; // <- critical for debounce-after-replay
                this.maybePushLayoutPatch(tools.push);
            }, 150);
        };

        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-layout`,
            this._dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.LAYOUT)(
                scheduleLayoutCheck,
            ),
        );

        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-about-to-remove`,
            this._dashboard
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DashboardTopic.MODULE_INSTANCE_ABOUT_TO_BE_REMOVED)(() => {
                const id = this._dashboard.makeSnapshotGetter(DashboardTopic.MODULE_INSTANCE_ABOUT_TO_BE_REMOVED)();
                if (!id) return;

                const mi = this._dashboard.getModuleInstance(id);
                const layoutBefore = this._dashboard.getLayout().find((el) => el.moduleInstanceId === id);
                if (!mi || !layoutBefore) return;

                this._removedStateCache.set(id, {
                    moduleState: mi.serializeState(),
                    layoutBefore: { ...layoutBefore },
                });
            }),
        );

        // Optional robustness: structural changes
        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-modules`,
            this._dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.MODULE_INSTANCES)(
                scheduleLayoutCheck,
            ),
        );

        tools.unsubs.registerUnsubscribeFunction(
            `dash-${this._dashboard.getId()}-active`,
            this._dashboard
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(DashboardTopic.ACTIVE_MODULE_INSTANCE_ID)(() => {
                if (isBlocked()) return;
                this.maybePushActive(tools.push);
            }),
        );
    }

    onDetach() {
        if (this._layoutDebounce) {
            clearTimeout(this._layoutDebounce);
            this._layoutDebounce = null;
        }
    }

    private captureLayoutOnly(): LayoutElement[] {
        // Clone to avoid mutation issues
        return this._dashboard.getLayout().map((el) => ({
            ...el,
            minimized: el.minimized ?? false,
            maximized: el.maximized ?? false,
        }));
    }

    private captureActive(): DashboardActiveModuleHistoryState {
        return { activeModuleInstanceId: this._dashboard.getActiveModuleInstanceId() };
    }

    private maybePushLayoutPatch(push: (cmd: any) => void) {
        const nextLayout = this.captureLayoutOnly();

        if (!this._layoutBaseline) {
            this._layoutBaseline = nextLayout;
            return;
        }

        // Generate minimal patch + capture moduleState only for removed ids
        const patch = diffLayout(this._layoutBaseline, nextLayout, this._dashboard);

        if (isEmptyPatch(patch)) {
            // Still update baseline so we don’t re-diff against stale refs/order
            this._layoutBaseline = nextLayout;
            return;
        }

        push(new DashboardLayoutPatchCommand(this._dashboard, patch));
        this._layoutBaseline = nextLayout;
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
