import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { ModuleInstance } from "../../ModuleInstance";
import { DashboardTopic, type Dashboard } from "../Dashboard/Dashboard";
import type { PrivateWorkbenchSession } from "../WorkbenchSession/PrivateWorkbenchSession";
import { PrivateWorkbenchSessionTopic } from "../WorkbenchSession/PrivateWorkbenchSession";

import { UndoRedoGenerator, type UndoRedoGeneratorImpl } from "./UndoRedoGenerator";
import type { UndoRedoManager } from "./UndoRedoManager";

export type UndoRedoGeneratorFactories = {
    session?: (session: PrivateWorkbenchSession) => UndoRedoGeneratorImpl;
    dashboard?: (dashboard: Dashboard) => UndoRedoGeneratorImpl;
    moduleInstance?: (moduleInstance: ModuleInstance<any, any>) => UndoRedoGeneratorImpl;
};

export class UndoRedoCoordinator {
    private readonly _unsubs = new UnsubscribeFunctionsManagerDelegate();

    private readonly _undoRedoManager: UndoRedoManager;
    private readonly _session: PrivateWorkbenchSession;
    private readonly _factories: UndoRedoGeneratorFactories;

    private _sessionGenerator: UndoRedoGenerator | null = null;

    private _dashboardGenerators = new Map<string, UndoRedoGenerator>();
    private _moduleInstanceGenerators = new Map<string, Map<string, UndoRedoGenerator>>();

    private _attached = false;

    constructor(
        undoRedoManager: UndoRedoManager,
        session: PrivateWorkbenchSession,
        factories: UndoRedoGeneratorFactories,
    ) {
        this._undoRedoManager = undoRedoManager;
        this._session = session;
        this._factories = factories;
    }

    attach(): void {
        if (this._attached) return;
        this._attached = true;

        if (this._factories.session) {
            this._sessionGenerator = new UndoRedoGenerator(this._factories.session(this._session));
            this._sessionGenerator.attach(this._undoRedoManager);
        }

        this._unsubs.registerUnsubscribeFunction(
            "session-dashboards",
            this._session.getPublishSubscribeDelegate().makeSubscriberFunction(PrivateWorkbenchSessionTopic.DASHBOARDS)(
                () => {
                    this.syncDashboards();
                },
            ),
        );

        this.syncDashboards();
    }

    detach(): void {
        if (!this._attached) return;
        this._attached = false;

        this._sessionGenerator?.detach();
        this._sessionGenerator = null;

        for (const generator of this._dashboardGenerators.values()) {
            generator.detach();
        }
        this._dashboardGenerators.clear();

        for (const generator of this._moduleInstanceGenerators.values()) {
            for (const moduleInstanceGenerator of generator.values()) {
                moduleInstanceGenerator.detach();
            }
        }
        this._moduleInstanceGenerators.clear();

        this._unsubs.unsubscribeAll();
    }

    pause(): void {
        this._sessionGenerator?.pause();
        for (const generator of this._dashboardGenerators.values()) {
            generator.pause();
        }
        for (const generator of this._moduleInstanceGenerators.values()) {
            for (const moduleInstanceGenerator of generator.values()) {
                moduleInstanceGenerator.pause();
            }
        }
    }

    resume(): void {
        this._sessionGenerator?.resume();
        for (const generator of this._dashboardGenerators.values()) {
            generator.resume();
        }
        for (const generator of this._moduleInstanceGenerators.values()) {
            for (const moduleInstanceGenerator of generator.values()) {
                moduleInstanceGenerator.resume();
            }
        }
    }

    private syncDashboards(): void {
        const dashboards = this._session.getDashboards();
        const currentIds = new Set(dashboards.map((d) => d.getId()));

        // Remove generators for dashboards that no longer exist
        for (const [id, generator] of this._dashboardGenerators.entries()) {
            if (!currentIds.has(id)) {
                generator.detach();
                this._dashboardGenerators.delete(id);

                const moduleInstances = this._moduleInstanceGenerators.get(id);
                if (moduleInstances) {
                    for (const generator of moduleInstances.values()) {
                        generator.detach();
                    }
                    moduleInstances.clear();
                    this._moduleInstanceGenerators.delete(id);
                }

                this._unsubs.unsubscribe(`dashboard-${id}`);
            }
        }

        // Add generators for new dashboards
        for (const dashboard of dashboards) {
            const id = dashboard.getId();

            if (!this._dashboardGenerators.has(id) && this._factories.dashboard) {
                const generator = new UndoRedoGenerator(this._factories.dashboard(dashboard));
                generator.attach(this._undoRedoManager);
                this._dashboardGenerators.set(id, generator);
            }

            // Sync module instances
            this._unsubs.unsubscribe(`dashboard-${id}`);
            this._unsubs.registerUnsubscribeFunction(
                `dashboard-${id}`,
                dashboard.getPublishSubscribeDelegate().makeSubscriberFunction(DashboardTopic.MODULE_INSTANCES)(() => {
                    this.syncModuleInstancesForDashboard(dashboard);
                }),
            );

            this.syncModuleInstancesForDashboard(dashboard);
        }
    }

    private syncModuleInstancesForDashboard(dashboard: Dashboard): void {
        if (!this._factories.moduleInstance) return;

        const dashboardId = dashboard.getId();
        const moduleInstances = dashboard.getModuleInstances();
        const currentIds = new Set(moduleInstances.map((m) => m.getId()));

        let moduleInstanceGenerators = this._moduleInstanceGenerators.get(dashboardId);
        if (!moduleInstanceGenerators) {
            moduleInstanceGenerators = new Map<string, UndoRedoGenerator>();
            this._moduleInstanceGenerators.set(dashboardId, moduleInstanceGenerators);
        }

        // Remove generators for module instances that no longer exist
        for (const [id, generator] of moduleInstanceGenerators.entries()) {
            if (!currentIds.has(id)) {
                generator.detach();
                moduleInstanceGenerators.delete(id);
            }
        }

        // Add generators for new module instances
        for (const moduleInstance of moduleInstances) {
            const id = moduleInstance.getId();

            if (moduleInstanceGenerators.has(id)) continue;

            const impl = this._factories.moduleInstance(moduleInstance);
            const generator = new UndoRedoGenerator(impl);
            generator.attach(this._undoRedoManager);
            moduleInstanceGenerators.set(id, generator);
        }
    }
}
