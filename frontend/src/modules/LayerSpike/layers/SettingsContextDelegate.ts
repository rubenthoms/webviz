import { isEqual } from "lodash";

import { LayerManager } from "./LayerManager";
import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { Setting, SettingTopic, Settings } from "./interfaces";

export enum SettingsContextDelegateTopic {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    REFETCH_REQUIRED = "REFETCH_REQUIRED",
    AVAILABLE_SETTINGS_CHANGED = "AVAILABLE_SETTINGS_CHANGED",
}

export type SettingsContextDelegatePayloads = {
    [SettingsContextDelegateTopic.SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED]: void;
    [SettingsContextDelegateTopic.REFETCH_REQUIRED]: void;
};

export interface MaybeFetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (oldValues: { [K in TKey]: TSettings[K] }, newValues: { [K in TKey]: TSettings[K] }): boolean;
}

export interface FetchDataFunction<TSettings extends Settings, TKey extends keyof TSettings> {
    (values: { [K in TKey]: TSettings[K] }): void;
}

export class SettingsContextDelegate<TSettings extends Settings, TKey extends keyof TSettings = keyof TSettings>
    implements PublishSubscribe<SettingsContextDelegateTopic, SettingsContextDelegatePayloads>
{
    private _settings: { [K in TKey]: Setting<TSettings[K]> } = {} as { [K in TKey]: Setting<TSettings[K]> };
    private _cachedValues: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _values: { [K in TKey]: TSettings[K] } = {} as { [K in TKey]: TSettings[K] };
    private _availableSettingsValues: Partial<{ [K in TKey]: Exclude<TSettings[K], null>[] }> = {};
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingsContextDelegateTopic>();
    private _refetchRequired: MaybeFetchDataFunction<TSettings, TKey>;
    private _layerManager: LayerManager | null = null;

    constructor(
        settings: { [K in TKey]: Setting<TSettings[K]> },
        refetchRequiredFunc: MaybeFetchDataFunction<TSettings, TKey>
    ) {
        for (const key in settings) {
            this._values[key] = settings[key].getValue();
            settings[key].makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                this._values[key] = settings[key].getValue();
                this.handleSettingsChanged();
            });
            this._availableSettingsValues[key] = [];
        }

        this._settings = settings;
        this._cachedValues = { ...this._values };
        this._refetchRequired = refetchRequiredFunc;
    }

    private handleSettingsChanged() {
        if (!isEqual(this._cachedValues, this._values)) {
            if (this._refetchRequired(this._cachedValues, this._values)) {
                this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.REFETCH_REQUIRED);
            }
            this._cachedValues = { ...this._values };
            this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.SETTINGS_CHANGED);
        }
    }

    setLayerManager(layerManager: LayerManager | null) {
        this._layerManager = layerManager;
    }

    getLayerManager(): LayerManager {
        if (this._layerManager === null) {
            throw new Error("LayerManager not set");
        }
        return this._layerManager;
    }

    setAvailableValues<K extends TKey>(key: K, availableValues: Exclude<TSettings[K], null>[]): void {
        this._availableSettingsValues[key] = availableValues;
        this._settings[key].setAvailableValues(availableValues);
        this._publishSubscribeHandler.notifySubscribers(SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED);
    }

    getAvailableValues<K extends TKey>(key: K): Exclude<TSettings[K], null>[] {
        if (!this._availableSettingsValues[key]) {
            throw new Error(`No available values for key: ${key.toString()}`);
        }
        return this._availableSettingsValues[key];
    }

    getSettings() {
        return this._settings;
    }

    makeSnapshotGetter<T extends SettingsContextDelegateTopic>(topic: T): () => SettingsContextDelegatePayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingsContextDelegateTopic.SETTINGS_CHANGED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.REFETCH_REQUIRED) {
                return;
            }
            if (topic === SettingsContextDelegateTopic.AVAILABLE_SETTINGS_CHANGED) {
                return this._availableSettingsValues;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: SettingsContextDelegateTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }
}
