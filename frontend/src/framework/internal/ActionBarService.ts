import { PublishSubscribe, PublishSubscribeDelegate } from "@lib/utils/PublishSubscribeDelegate";

export interface ActionBarItemBase {
    id: string;
    label?: string;
    group?: string;
    order?: number;
    isVisible?: boolean;
    isEnabled?: boolean;
}

export interface ActionBarButtonItem extends ActionBarItemBase {
    kind: "button";
    run: () => void | Promise<void>;
}

export interface ActionBarToggleItem extends ActionBarItemBase {
    kind: "toggle";
    value: boolean;
    setValue: (value: boolean) => void;
}

export interface ActionBarSelectItem extends ActionBarItemBase {
    kind: "select";
    value: string;
    options: Array<{ value: string; label: string }>;
    setValue: (value: string) => void;
}

export interface ActionBarNumberStepperItem extends ActionBarItemBase {
    kind: "number-stepper";
    value: number;
    min?: number;
    max?: number;
    step?: number;
    setValue: (value: number) => void;
}

export interface ActionBarGroupItem extends ActionBarItemBase {
    kind: "group";
    items: ActionBarItem[];
}

export interface ActionBarDividerItem {
    kind: "divider";
    id: string;
    group?: string;
    order?: number;
}

export type ActionBarItem =
    | ActionBarButtonItem
    | ActionBarToggleItem
    | ActionBarSelectItem
    | ActionBarNumberStepperItem
    | ActionBarGroupItem
    | ActionBarDividerItem;

export interface ActionBarTab {
    id: string;
    label: string;
    order?: number;
    items: readonly ActionBarItem[];
    isTemporary?: boolean;
}

export interface ActionBarState {
    tabs: readonly ActionBarTab[];
    activeTabId: string | null;
}

export enum ActionBarTopic {
    TABS = "tabs",
    ACTIVE_TAB = "activeTab",
}

export type ActionBarTopicPayloads = {
    [ActionBarTopic.TABS]: readonly ActionBarTab[];
    [ActionBarTopic.ACTIVE_TAB]: string | null;
};

export class ActionBarService implements PublishSubscribe<ActionBarTopicPayloads> {
    private _publishSubscribeDelegate = new PublishSubscribeDelegate<ActionBarTopicPayloads>();

    private _tabs: readonly ActionBarTab[] = [];
    private _activeTabId: string | null = null;

    getPublishSubscribeDelegate() {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof ActionBarTopicPayloads>(topic: T): () => ActionBarTopicPayloads[T] {
        const getters: { [K in keyof ActionBarTopicPayloads]: () => ActionBarTopicPayloads[K] } = {
            [ActionBarTopic.TABS]: () => this._tabs,
            [ActionBarTopic.ACTIVE_TAB]: () => this._activeTabId,
        };

        return getters[topic];
    }

    setTabs(tabs: readonly ActionBarTab[]): void {
        this._tabs = this._normalizeTabs(tabs);

        if (!this._activeTabId || !this._tabs.some((tab) => tab.id === this._activeTabId)) {
            this._activeTabId = this._tabs[0]?.id ?? null;
        }

        this._publishSubscribeDelegate.notifySubscribers(ActionBarTopic.TABS);
    }

    private _normalizeTabs(tabs: readonly ActionBarTab[]): readonly ActionBarTab[] {
        return [...tabs]
            .map((tab) => ({
                ...tab,
                items: this._normalizeItems(tab.items),
            }))
            .sort((a, b) => {
                const orderA = a.order ?? 0;
                const orderB = b.order ?? 0;

                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                return a.id.localeCompare(b.id);
            });
    }

    private _normalizeItems(items: readonly ActionBarItem[]): readonly ActionBarItem[] {
        return [...items]
            .filter((item) => !("isVisible" in item) || item.isVisible !== false)
            .sort((a, b) => {
                const orderA = "order" in a ? (a.order ?? 0) : 0;
                const orderB = "order" in b ? (b.order ?? 0) : 0;

                if (orderA !== orderB) {
                    return orderA - orderB;
                }

                return a.id.localeCompare(b.id);
            });
    }
}
