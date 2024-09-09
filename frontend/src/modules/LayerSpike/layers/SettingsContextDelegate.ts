import { isEqual } from "lodash";

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

export interface MaybeFetchDatFunction<TSettings extends Settings> {
    (
        oldValues: Record<keyof TSettings, TSettings[keyof TSettings]>,
        newValues: Record<keyof TSettings, TSettings[keyof TSettings]>
    ): boolean;
}

export interface FetchDataFunction<TSettings extends Settings> {
    (values: Record<keyof TSettings, TSettings[keyof TSettings]>): void;
}

export class SettingsContextDelegate<TSettings extends Settings>
    implements PublishSubscribe<SettingsContextDelegateTopic, SettingsContextDelegatePayloads>
{
    private _settings: Record<keyof TSettings, Setting<TSettings[keyof TSettings]>>;
    private _cachedValues: Record<keyof TSettings, TSettings[keyof TSettings]> = {} as Record<
        keyof TSettings,
        TSettings[keyof TSettings]
    >;
    private _values: Record<keyof TSettings, TSettings[keyof TSettings]> = {} as Record<
        keyof TSettings,
        TSettings[keyof TSettings]
    >;
    private _availableSettingsValues: Partial<Record<keyof TSettings, TSettings[keyof TSettings][]>> = {};
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingsContextDelegateTopic>();
    private _refetchRequired: MaybeFetchDatFunction<TSettings>;

    constructor(
        settings: Record<keyof TSettings, Setting<TSettings[keyof TSettings]>>,
        refetchRequiredFunc: MaybeFetchDatFunction<TSettings>
    ) {
        for (const key in settings) {
            this._values[key] = settings[key].getValue();
            settings[key].makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
                this._values[key] = settings[key].getValue();
                this.handleSettingsChanged();
            });
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
                return;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: SettingsContextDelegateTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }
}
