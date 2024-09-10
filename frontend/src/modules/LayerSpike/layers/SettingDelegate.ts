import { PublishSubscribe, PublishSubscribeHandler } from "./PublishSubscribeHandler";
import { SettingTopic, SettingTopicPayloads } from "./interfaces";

export class SettingDelegate<TValue> implements PublishSubscribe<SettingTopic, SettingTopicPayloads<TValue>> {
    private _value: TValue;
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingTopic>();
    private _availableValues: TValue[] = [];
    private _overriddenValue: TValue | undefined = undefined;
    private _loading: boolean = false;

    constructor(value: TValue) {
        this._value = value;
    }

    getValue(): TValue {
        if (this._overriddenValue !== undefined) {
            return this._overriddenValue;
        }
        return this._value;
    }

    setValue(value: TValue) {
        this._value = value;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    setLoadingState(loading: boolean): void {
        this._loading = loading;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.LOADING_STATE_CHANGED);
    }

    setOverriddenValue(overriddenValue: TValue | undefined): void {
        this._overriddenValue = overriddenValue;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.OVERRIDDEN_CHANGED);
        if (overriddenValue !== undefined) {
            this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
        }
    }

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<TValue>[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingTopic.VALUE_CHANGED) {
                return this._value;
            }
            if (topic === SettingTopic.AVAILABLE_VALUES_CHANGED) {
                return this._availableValues;
            }
            if (topic === SettingTopic.OVERRIDDEN_CHANGED) {
                return this._overriddenValue;
            }
            if (topic === SettingTopic.LOADING_STATE_CHANGED) {
                return this._loading;
            }
        };

        return snapshotGetter;
    }

    getPublishSubscribeHandler(): PublishSubscribeHandler<SettingTopic> {
        return this._publishSubscribeHandler;
    }

    getAvailableValues(): TValue[] {
        return this._availableValues;
    }

    setAvailableValues(availableValues: TValue[]): void {
        this._availableValues = availableValues;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }
}
