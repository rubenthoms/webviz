import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { Setting, SettingTopic } from "./interfaces";

export enum SettingsContextTopic {
    AVAILABE_SETTINGS_CHANGED = "AVAILABE_SETTINGS_CHANGED",
}

export type SettingsContextTopicPayloads = {
    [SettingsContextTopic.AVAILABE_SETTINGS_CHANGED]: Setting<any>[];
};

export class SettingsContextHelper implements PublishSubscribe<SettingsContextTopic, SettingsContextTopicPayloads> {
    private _settings: Setting<any>[];
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingsContextTopic>();
    private _checkIfRefetchRequired: () => boolean;
    private _fetchAvailableSettings: () => any[][];

    constructor(checkIfRefetchRequired: () => boolean, fetchAvailableSettings: () => any[][]) {
        this._settings = [];
    }

    addSetting(setting: Setting<any>) {
        this._settings.push(setting);
        setting.makeSubscriberFunction(SettingTopic.VALUE_CHANGED)(() => {
            this.maybeRefetchAvailableSettings();
        });
    }

    getSettings() {
        return this._settings;
    }

    private maybeRefetchAvailableSettings() {
        if (this._checkIfRefetchRequired()) {
            const newSettings = this._fetchAvailableSettings();
            this._publishSubscribeHandler.notifySubscribers(SettingsContextTopic.AVAILABE_SETTINGS_CHANGED);
        }
    }

    makeSnapshotGetter<T extends SettingsContextTopic>(topic: T): () => SettingsContextTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingsContextTopic.AVAILABE_SETTINGS_CHANGED) {
                return this._settings;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: SettingsContextTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }
}
