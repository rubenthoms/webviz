import React from "react";

import { v4 } from "uuid";

import { SettingType } from "./SettingTypes";

export enum SettingTopic {
    VALUE = "value",
}

export class BaseSetting<TValue> {
    private _id: string;
    private _key: string;
    private _name: string;
    private _value: TValue;
    private _requiredSettings: SettingType[];
    private _subscribers: Map<SettingTopic, Set<() => void>> = new Map();

    constructor(key: string, name: string, initialValue: TValue, requiredSettings: SettingType[] = []) {
        this._id = v4();
        this._key = key;
        this._name = name;
        this._value = initialValue;
        this._requiredSettings = requiredSettings;
    }

    getId(): string {
        return this._id;
    }

    getKey(): string {
        return this._key;
    }

    getName(): string {
        return this._name;
    }

    getValue(): TValue {
        return this._value;
    }

    setValue(value: TValue): void {
        this._value = value;
        this.notifySubscribers(SettingTopic.VALUE);
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
