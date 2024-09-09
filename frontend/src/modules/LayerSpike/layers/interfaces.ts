import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { Broker } from "./Broker";
import { GroupDelegate } from "./GroupDelegate";
import { LayerDelegate } from "./LayerDelegate";
import { PublishSubscribe } from "./PublishSubscribeHandler";
import { SettingsContextDelegate } from "./SettingsContextDelegate";

export interface Item {
    getId(): string;
    getBroker(): Broker;
}

export function instanceofItem(item: any): item is Item {
    return (item as Item).getId !== undefined;
}

export interface Group extends Item {
    getName(): string;
    setName(name: string): void;
    getGroupDelegate(): GroupDelegate;
}

export function instanceofGroup(item: Item): item is Group {
    return (
        (item as Group).getName !== undefined &&
        (item as Group).setName !== undefined &&
        (item as Group).getGroupDelegate !== undefined
    );
}

export interface Layer<TSettings extends Settings> extends Item {
    getName(): string;
    getSettingsContext(): SettingsContext<TSettings>;
    getLayerDelegate(): LayerDelegate<TSettings>;
}

export function instanceofLayer(item: Item): item is Layer<Settings> {
    return (
        (item as Layer<Settings>).getSettingsContext !== undefined &&
        (item as Layer<Settings>).getLayerDelegate !== undefined &&
        (item as Layer<Settings>).getName !== undefined
    );
}

export interface SettingsContext<TSettings extends Settings> {
    getSettings(): Record<keyof TSettings, Setting<TSettings[keyof TSettings]>>;
    getDelegate(): SettingsContextDelegate<TSettings>;
}

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    availableValues: TValue[];
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export interface Setting<TValue> extends PublishSubscribe<SettingTopic, SettingTopicPayloads<TValue>> {
    getLabel(): string;
    setValue(value: TValue): void;
    getValue(): TValue;
    getAvailableValues(): TValue[];
    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode;
}

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
}

export type SettingTopicPayloads<TValue> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
};

export type Settings = {
    [key: string]: unknown;
};
