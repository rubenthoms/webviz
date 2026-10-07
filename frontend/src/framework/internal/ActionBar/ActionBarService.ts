import type { ActionBarTab } from "@framework/ActionBar";
import { PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

export type ActionBarState = {
    readonly tabs: readonly ActionBarTab[];
    readonly activeTabId: string;
};

enum ActionBarServiceTopic {
    STATE = "state",
}

type ActionBarServiceTopicPayloads = {
    [ActionBarServiceTopic.STATE]: void;
};

/**
 * Holds what the Action Bar of one dashboard currently displays. Knows nothing about modules,
 * selection or activation requests - that is decided by `DashboardActionBarController`.
 */
export class ActionBarService {
    private _state: ActionBarState;
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<ActionBarServiceTopicPayloads>();

    constructor(initialActiveTabId: string) {
        this._state = Object.freeze({ tabs: Object.freeze([]), activeTabId: initialActiveTabId });
    }

    // Arrow functions to keep stable identities for useSyncExternalStore
    readonly getSnapshot = (): ActionBarState => {
        return this._state;
    };

    readonly subscribe = (listener: () => void): (() => void) => {
        return this._publishSubscribeDelegate.subscribe(ActionBarServiceTopic.STATE, listener);
    };

    setState(tabs: readonly ActionBarTab[], activeTabId: string): void {
        if (tabs === this._state.tabs && activeTabId === this._state.activeTabId) {
            return;
        }
        this._state = Object.freeze({ tabs, activeTabId });
        this._publishSubscribeDelegate.notifySubscribers(ActionBarServiceTopic.STATE);
    }
}
