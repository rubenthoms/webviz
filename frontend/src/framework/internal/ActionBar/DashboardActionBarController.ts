import type { ActionBarTab } from "@framework/ActionBar";
import type { ModuleInstance } from "@framework/ModuleInstance";

import { ActionBarService } from "./ActionBarService";
import { FRAMEWORK_HOME_TAB_ID } from "./ModuleActionBarRegistry";

/**
 * Feeds one dashboard's `ActionBarService` from its active module instance: composes tabs, applies
 * activation requests that arrive while the module is active, and remembers each module's tab.
 *
 * Bookkeeping is keyed by instance object, as module instance ids can change during deserialization.
 */
export class DashboardActionBarController {
    private _actionBarService = new ActionBarService(FRAMEWORK_HOME_TAB_ID);
    private _activeModuleInstance: ModuleInstance<any, any> | null = null;
    private _unsubscribeFromActiveModule: (() => void) | null = null;
    private _lastConsumedActivationRevision = new WeakMap<ModuleInstance<any, any>, number>();
    private _preferredTabByModule = new WeakMap<ModuleInstance<any, any>, string>();

    getActionBarService(): ActionBarService {
        return this._actionBarService;
    }

    setActiveModuleInstance(moduleInstance: ModuleInstance<any, any> | null): void {
        if (moduleInstance === this._activeModuleInstance) {
            return;
        }

        this._unsubscribeFromActiveModule?.();
        this._unsubscribeFromActiveModule = null;
        this._activeModuleInstance = moduleInstance;

        if (!moduleInstance) {
            this._actionBarService.setState([], FRAMEWORK_HOME_TAB_ID);
            return;
        }

        const registry = moduleInstance.getActionBarRegistry();

        // Requests raised while the module was inactive (e.g. observing another module's selection)
        // must not steal focus when switching to it
        const pendingRevision = registry.getModel().activationRequest?.revision ?? 0;
        this._lastConsumedActivationRevision.set(moduleInstance, pendingRevision);

        this._unsubscribeFromActiveModule = registry.subscribe(() => this.handleActiveModuleModelChange());

        const tabs = registry.getModel().tabs;
        const preferredTabId = this._preferredTabByModule.get(moduleInstance) ?? FRAMEWORK_HOME_TAB_ID;
        this.publish(tabs, this.resolveExistingTab(tabs, preferredTabId));
    }

    /**
     * Called for explicit user tab selection.
     */
    selectTab(tabId: string): void {
        const tabs = this._actionBarService.getSnapshot().tabs;
        this.publish(tabs, this.resolveExistingTab(tabs, tabId));
    }

    private handleActiveModuleModelChange(): void {
        const moduleInstance = this._activeModuleInstance;
        if (!moduleInstance) {
            return;
        }

        const { tabs, activationRequest } = moduleInstance.getActionBarRegistry().getModel();
        const lastConsumedRevision = this._lastConsumedActivationRevision.get(moduleInstance) ?? 0;

        let activeTabId = this._actionBarService.getSnapshot().activeTabId;
        if (activationRequest && activationRequest.revision > lastConsumedRevision) {
            this._lastConsumedActivationRevision.set(moduleInstance, activationRequest.revision);
            activeTabId = activationRequest.tabId;
        }

        this.publish(tabs, this.resolveExistingTab(tabs, activeTabId));
    }

    private resolveExistingTab(tabs: readonly ActionBarTab[], tabId: string): string {
        if (tabId === FRAMEWORK_HOME_TAB_ID || tabs.some((tab) => tab.id === tabId)) {
            return tabId;
        }
        return FRAMEWORK_HOME_TAB_ID;
    }

    private publish(tabs: readonly ActionBarTab[], activeTabId: string): void {
        if (this._activeModuleInstance) {
            this._preferredTabByModule.set(this._activeModuleInstance, activeTabId);
        }
        this._actionBarService.setState(tabs, activeTabId);
    }
}
