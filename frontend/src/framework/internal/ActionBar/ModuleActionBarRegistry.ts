import type {
    ActionBarContribution,
    ActionBarControl,
    ActionBarGroup,
    ActionBarTab,
    ModuleActionBarContributionApi,
} from "@framework/ActionBar";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

/** Tab ids owned by the framework. Module contributions targeting them are dropped. */
export const FRAMEWORK_HOME_TAB_ID = "home";

export type ActionBarActivationRequest = {
    readonly revision: number;
    readonly tabId: string;
};

export type ResolvedActionBarModel = {
    readonly tabs: readonly ActionBarTab[];
    /** Latest activation request. Consumers track which revision they have already handled. */
    readonly activationRequest: ActionBarActivationRequest | null;
};

enum RegistryTopic {
    MODEL = "model",
}

type RegistryTopicPayloads = {
    [RegistryTopic.MODEL]: void;
};

const EMPTY_MODEL: ResolvedActionBarModel = Object.freeze({ tabs: Object.freeze([]), activationRequest: null });

function compareByOrderAndId(a: { order?: number; id: string }, b: { order?: number; id: string }): number {
    const orderDiff = (a.order ?? 0) - (b.order ?? 0);
    if (orderDiff !== 0) {
        return orderDiff;
    }
    return a.id.localeCompare(b.id);
}

/**
 * Collects the Action Bar contributions of one module instance's React trees and resolves them into
 * tabs. Notifications are batched per microtask, which also coalesces simultaneous activation
 * transitions (e.g. several features reacting to one selection) into a single request.
 */
export class ModuleActionBarRegistry implements ModuleActionBarContributionApi {
    private _contributions = new Map<string, ActionBarContribution>();
    private _pendingActivationTabIds = new Set<string>();
    private _activationRevision = 0;
    private _model: ResolvedActionBarModel = EMPTY_MODEL;
    private _isFlushScheduled = false;
    private _isDisposed = false;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<RegistryTopicPayloads>();

    readonly getModel = (): ResolvedActionBarModel => {
        return this._model;
    };

    readonly subscribe = (listener: () => void): (() => void) => {
        return this._publishSubscribeDelegate.subscribe(RegistryTopic.MODEL, listener);
    };

    // Arrow functions so the registry itself can be passed around as a stable context value
    readonly setContribution = (id: string, contribution: ActionBarContribution): void => {
        if (this._isDisposed) {
            return;
        }

        if (contribution.tab.id === FRAMEWORK_HOME_TAB_ID) {
            console.error(`Module contributions cannot target the framework-owned tab "${FRAMEWORK_HOME_TAB_ID}"`);
            return;
        }

        const previous = this._contributions.get(id);
        if (previous === contribution) {
            return;
        }

        const isNewlyApplicable = previous === undefined;
        const hasNewActivationKey = previous !== undefined && previous.activationKey !== contribution.activationKey;
        if (contribution.activation === "activate" && (isNewlyApplicable || hasNewActivationKey)) {
            this._pendingActivationTabIds.add(contribution.tab.id);
        }

        this._contributions.set(id, contribution);
        this.scheduleFlush();
    };

    readonly removeContribution = (id: string): void => {
        if (this._isDisposed || !this._contributions.delete(id)) {
            return;
        }
        this.scheduleFlush();
    };

    dispose(): void {
        this._isDisposed = true;
        this._contributions.clear();
        this._pendingActivationTabIds.clear();
        this._model = EMPTY_MODEL;
    }

    private scheduleFlush(): void {
        if (this._isFlushScheduled) {
            return;
        }
        this._isFlushScheduled = true;
        queueMicrotask(() => {
            this._isFlushScheduled = false;
            if (!this._isDisposed) {
                this.flush();
            }
        });
    }

    private flush(): void {
        const tabs = this.resolveTabs();

        let activationRequest = this._model.activationRequest;
        const requestedTabs = tabs.filter((tab) => this._pendingActivationTabIds.has(tab.id));
        this._pendingActivationTabIds.clear();
        if (requestedTabs.length > 0) {
            this._activationRevision++;
            // Tabs are already sorted, so the first requested one wins
            activationRequest = { revision: this._activationRevision, tabId: requestedTabs[0].id };
        }

        this._model = Object.freeze({ tabs, activationRequest });
        this._publishSubscribeDelegate.notifySubscribers(RegistryTopic.MODEL);
    }

    private resolveTabs(): ActionBarTab[] {
        type MutableTab = Omit<ActionBarTab, "groups"> & { groups: Map<string, MutableGroup> };
        type MutableGroup = Omit<ActionBarGroup, "controls"> & { controls: ActionBarControl[] };

        const tabs = new Map<string, MutableTab>();

        for (const contribution of this._contributions.values()) {
            let tab = tabs.get(contribution.tab.id);
            if (!tab) {
                tab = { ...contribution.tab, groups: new Map() };
                tabs.set(tab.id, tab);
            } else if (tab.label !== contribution.tab.label || tab.order !== contribution.tab.order) {
                console.warn(`Conflicting metadata for Action Bar tab "${tab.id}" - keeping the first contributor's`);
            }

            for (const group of contribution.groups) {
                let mergedGroup = tab.groups.get(group.id);
                if (!mergedGroup) {
                    mergedGroup = { id: group.id, label: group.label, order: group.order, controls: [] };
                    tab.groups.set(group.id, mergedGroup);
                }

                for (const control of group.controls) {
                    if (mergedGroup.controls.some((el) => el.id === control.id)) {
                        console.error(`Duplicate control "${control.id}" in Action Bar group "${group.id}"`);
                        continue;
                    }
                    mergedGroup.controls.push(control);
                }
            }
        }

        return Array.from(tabs.values())
            .map((tab) => ({
                ...tab,
                groups: Array.from(tab.groups.values())
                    .filter((group) => group.controls.length > 0)
                    .sort(compareByOrderAndId),
            }))
            .filter((tab) => tab.groups.length > 0)
            .sort(compareByOrderAndId);
    }
}
