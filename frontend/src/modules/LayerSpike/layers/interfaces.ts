import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { GroupHandler } from "./GroupHandler";
import { PublishSubscribe } from "./PublishSubscribeHandler";

export interface Item {
    getId(): string;
}

export function instanceofItem(item: any): item is Item {
    return (item as Item).getId !== undefined;
}

export interface Group extends Item {
    getName(): string;
    setName(name: string): void;
    getGroupHandler(): GroupHandler;
}

export function instanceofGroup(item: Item): item is Group {
    return (
        (item as Group).getName !== undefined &&
        (item as Group).setName !== undefined &&
        (item as Group).getGroupHandler !== undefined
    );
}

export interface SettingsContext {
    getSettings(): Setting<any>[];
}

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    availableValues: TValue[];
    workbenchSettings: WorkbenchSettings;
    workbenchSession: WorkbenchSession;
};

export interface Setting<TValue> extends PublishSubscribe<SettingTopic, SettingTopicPayloads<TValue>> {
    getLabel(): string;
    setValue(value: TValue): void;
    getAvailableValues(): TValue[];
    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode;
}

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
}

export type SettingTopicPayloads<TValue> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
};
