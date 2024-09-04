import React from "react";

import { SettingType } from "./SettingTypes";

import { BaseItem, Message, MessageDirection, MessageType } from "../BaseItem";

export enum SettingTopic {
    VALUE = "value",
}

export class BaseSetting<TValue> extends BaseItem {
    private _key: string;
    private _type: SettingType;
    private _value: TValue;
    private _appliedSettings: Partial<Record<SettingType, any>> = {};
    private _requiredSettings: SettingType[];
    private _subscribers: Map<SettingTopic, Set<() => void>> = new Map();

    constructor(
        key: string,
        name: string,
        initialValue: TValue,
        type: SettingType,
        requiredSettings: SettingType[] = []
    ) {
        super(name);
        this._key = key;
        this._type = type;
        this._value = initialValue;
        this._requiredSettings = requiredSettings;
    }

    getAllAppliedSettings() {
        const settings: BaseSetting<any>[] = [];
        const visitedSettingTypes: SettingType[] = [];

        const items = this.getAncestorsAndSiblings();
        for (const item of items) {
            if (item instanceof BaseSetting) {
                const setting = item as BaseSetting<any>;
                if (visitedSettingTypes.includes(setting.getType())) {
                    continue;
                }
                visitedSettingTypes.push(setting.getType());
                settings.push(item);
            }
        }

        const appliedSettings: Partial<Record<SettingType, any>> = {};

        for (const setting of settings) {
            if (!this._requiredSettings.includes(setting.getType())) {
                continue;
            }

            appliedSettings[setting.getType()] = setting.getValue();
        }

        this._appliedSettings = appliedSettings;
    }

    getHasAllRequiredSettings(): boolean {
        return this._requiredSettings.every((settingType) => settingType in this._appliedSettings);
    }

    getKey(): string {
        return this._key;
    }

    getType(): SettingType {
        return this._type;
    }

    getValue(): TValue {
        return this._value;
    }

    setValue(value: TValue): void {
        this._value = value;
        this.notifySubscribers(SettingTopic.VALUE);
        const message = new Message(MessageType.CHANGED, null, this, MessageDirection.UP);
        this.emitMessage(message);
    }

    subscribe(topic: SettingTopic, callback: () => void): () => void {
        if (!this._subscribers.has(topic)) {
            this._subscribers.set(topic, new Set());
        }
        this._subscribers.get(topic)?.add(callback);

        return () => {
            this.unsubscribe(topic, callback);
        };
    }

    unsubscribe(topic: SettingTopic, callback: () => void): void {
        this._subscribers.get(topic)?.delete(callback);
    }

    protected notifySubscribers(topic: SettingTopic): void {
        for (const callback of this._subscribers.get(topic) ?? []) {
            callback();
        }
    }
}

export function useLayerSettingValue<TValue>(setting: BaseSetting<TValue>): TValue {
    const [value, setValue] = React.useState<TValue>(setting.getValue());

    React.useEffect(
        function handleHookMount() {
            function handleSettingChange() {
                setValue(setting.getValue());
            }

            const unsubscribe = setting.subscribe(SettingTopic.VALUE, handleSettingChange);

            return unsubscribe;
        },
        [setting]
    );

    return value;
}
