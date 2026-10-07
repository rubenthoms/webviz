import React from "react";

import type { ActionBarControl, ActionBarGroup, ActionBarTab } from "@framework/ActionBar";
import { FRAMEWORK_HOME_TAB_ID } from "@framework/internal/ActionBar/ModuleActionBarRegistry";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { NumberInput } from "@lib/components/NumberInput";
import { Separator } from "@lib/components/Separator";
import { Tabs } from "@lib/components/Tabs";
import { Toggle } from "@lib/components/Toggle";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useActiveDashboard } from "../ActiveDashboardBoundary";
import { useActiveSession } from "../ActiveSessionBoundary";

import { StartPanel } from "./_panels/start";

export type ActionBarProps = {
    workbench: Workbench;
};

export function ActionBar(props: ActionBarProps) {
    const session = useActiveSession();
    const dashboard = useActiveDashboard();
    const isSnapshot = usePublishSubscribeTopicValue(session, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const controller = dashboard.getActionBarController();
    const actionBarService = controller.getActionBarService();
    const state = React.useSyncExternalStore(actionBarService.subscribe, actionBarService.getSnapshot);

    if (isSnapshot) {
        return null;
    }

    const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId) ?? null;

    return (
        <div className="border-b-neutral-subtle bg-surface/30 shadow-elevation-raised flex flex-col border-b-2">
            <Tabs.Root value={state.activeTabId} onValueChange={(tabId: string) => controller.selectTab(tabId)}>
                <Tabs.List size="small">
                    <Tabs.Tab value={FRAMEWORK_HOME_TAB_ID}>Home</Tabs.Tab>
                    {state.tabs.map((tab) => (
                        <Tabs.Tab key={tab.id} value={tab.id}>
                            <span className={resolveClassNames({ "text-accent-strong": tab.contextual === true })}>
                                {tab.label}
                            </span>
                        </Tabs.Tab>
                    ))}
                </Tabs.List>
            </Tabs.Root>
            <div className="px-xs py-4xs gap-x-xs flex items-stretch">
                {activeTab ? <ActionBarTabContent tab={activeTab} /> : <StartPanel workbench={props.workbench} />}
            </div>
        </div>
    );
}

type ActionBarTabContentProps = {
    tab: ActionBarTab;
};

function ActionBarTabContent(props: ActionBarTabContentProps): React.ReactNode {
    return props.tab.groups.map((group, index) => (
        <React.Fragment key={group.id}>
            {index > 0 && <Separator orientation="vertical" />}
            <ActionBarGroupContent group={group} />
        </React.Fragment>
    ));
}

type ActionBarGroupContentProps = {
    group: ActionBarGroup;
};

function ActionBarGroupContent(props: ActionBarGroupContentProps): React.ReactNode {
    return (
        <div className="flex flex-col items-center">
            <div className="gap-x-3xs flex grow items-center">
                {props.group.controls.map((control) => (
                    <ActionBarControlContent key={control.id} control={control} />
                ))}
            </div>
            {props.group.label && <div className="text-body-xs text-neutral-subtle">{props.group.label}</div>}
        </div>
    );
}

type ActionBarControlContentProps = {
    control: ActionBarControl;
};

function ActionBarControlContent(props: ActionBarControlContentProps): React.ReactNode {
    const control = props.control;

    switch (control.type) {
        case "button":
            return (
                <Button
                    size="small"
                    variant="ghost"
                    disabled={control.action.isEnabled === false}
                    onClick={() => control.action.execute()}
                >
                    {control.action.icon}
                    {control.action.label}
                </Button>
            );
        case "toggle":
            return (
                <Toggle.Button
                    pressed={control.pressed}
                    onPressedChange={(pressed) => control.setPressed(pressed)}
                    disabled={control.isEnabled === false}
                    buttonProps={{ size: "small" }}
                >
                    {control.icon}
                    {control.label}
                </Toggle.Button>
            );
        case "number":
            return (
                <label className="gap-x-3xs text-body-sm flex items-center">
                    {control.label}
                    <NumberInput
                        size="small"
                        value={control.value}
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        disabled={control.isEnabled === false}
                        onValueChange={(value) => {
                            if (value !== null) {
                                control.setValue(value);
                            }
                        }}
                    />
                </label>
            );
        case "separator":
            return <Separator orientation="vertical" />;
    }
}
