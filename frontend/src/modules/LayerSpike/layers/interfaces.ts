import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { GroupDelegate } from "./GroupDelegate";
import { LayerDelegate } from "./LayerDelegate";
import { SettingDelegate } from "./SettingDelegate";
import { SettingType } from "./Settings";
import { SettingsContextDelegate } from "./SettingsContextDelegate";

export interface Item {
    getId(): string;
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

export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
    INVALID_SETTINGS = "INVALID_SETTINGS",
}

export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (oldValues: { [K in TKey]: TSettings[K] }, newValues: { [K in TKey]: TSettings[K] }): void;
}

export interface Layer<TSettings extends Settings, TData> extends Item {
    getName(): string;
    getSettingsContext(): SettingsContext<TSettings>;
    getDelegate(): LayerDelegate<TSettings, TData>;
    doSettingsChangesRequireDataRefetch(prevSettings: TSettings, newSettings: TSettings): boolean;
    fechData(queryClient: QueryClient): Promise<TData>;
}

export function instanceofLayer(item: Item): item is Layer<Settings, any> {
    return (
        (item as Layer<Settings, any>).getSettingsContext !== undefined &&
        (item as Layer<Settings, any>).getDelegate !== undefined &&
        (item as Layer<Settings, any>).getName !== undefined &&
        (item as Layer<Settings, any>).doSettingsChangesRequireDataRefetch !== undefined &&
        (item as Layer<Settings, any>).fechData !== undefined
    );
}

export interface SettingsContext<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings> {
    getSettings(): { [K in TKey]: Setting<TSettings[K]> };
    getDelegate(): SettingsContextDelegate<TSettings, TKey>;
    fetchData: FetchDataFunction<TSettings, TKey>;
    isValid(): boolean;
}

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    overriddenValue: TValue | null;
    isOverridden: boolean;
    availableValues: Exclude<TValue, null>[];
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export interface Setting<TValue> {
    getType(): SettingType;
    getLabel(): string;
    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode;
    getDelegate(): SettingDelegate<TValue>;
}

export enum SettingTopic {
    VALUE_CHANGED = "VALUE_CHANGED",
    VALUE_CHANGED_BY_USER = "VALUE_CHANGED_BY_USER",
    AVAILABLE_VALUES_CHANGED = "AVAILABLE_VALUES_CHANGED",
    OVERRIDDEN_CHANGED = "OVERRIDDEN_CHANGED",
    LOADING_STATE_CHANGED = "LOADING_STATE_CHANGED",
}

export type SettingTopicPayloads<TValue> = {
    [SettingTopic.VALUE_CHANGED]: TValue;
    [SettingTopic.VALUE_CHANGED_BY_USER]: TValue;
    [SettingTopic.AVAILABLE_VALUES_CHANGED]: Exclude<TValue, null>[];
    [SettingTopic.OVERRIDDEN_CHANGED]: TValue | undefined;
    [SettingTopic.LOADING_STATE_CHANGED]: boolean;
};

export type Settings = { [key in SettingType]?: unknown };
