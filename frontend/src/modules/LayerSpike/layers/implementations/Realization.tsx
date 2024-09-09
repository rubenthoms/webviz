import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { PublishSubscribeHandler } from "../PublishSubscribeHandler";
import { SettingType } from "../Settings";
import { Setting, SettingComponentProps, SettingTopic, SettingTopicPayloads } from "../interfaces";

export class Realization implements Setting<number | null> {
    private _value: number | null = null;
    private _publishSubscribeHandler = new PublishSubscribeHandler<SettingTopic>();
    private _availableValues: number[] = [];

    getType(): SettingType {
        return SettingType.REALIZATION;
    }

    getLabel(): string {
        return "Realization";
    }

    getValue(): number | null {
        return this._value;
    }

    setValue(value: number | null) {
        this._value = value;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.VALUE_CHANGED);
    }

    handleAvailableValuesChange(): void {
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }

    makeComponent(): (props: SettingComponentProps<number | null>) => React.ReactNode {
        return function Realization(props: SettingComponentProps<number | null>) {
            function handleSelectionChange(selectedValue: string) {
                const newValue = parseInt(selectedValue);
                props.onValueChange(newValue);
            }

            const options: DropdownOption[] = props.availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });
            return (
                <Dropdown
                    options={options}
                    value={props.value?.toString() ?? undefined}
                    onChange={handleSelectionChange}
                />
            );
        };
    }

    makeSnapshotGetter<T extends SettingTopic>(topic: T): () => SettingTopicPayloads<number | null>[T] {
        const snapshotGetter = (): any => {
            if (topic === SettingTopic.VALUE_CHANGED) {
                return this._value;
            }

            if (topic === SettingTopic.AVAILABLE_VALUES_CHANGED) {
                return this._availableValues;
            }
        };

        return snapshotGetter;
    }

    makeSubscriberFunction(topic: SettingTopic): (onStoreChangeCallback: () => void) => () => void {
        return this._publishSubscribeHandler.makeSubscriberFunction(topic);
    }

    getAvailableValues(): number[] {
        return this._availableValues;
    }

    setAvailableValues(availableValues: number[]): void {
        this._availableValues = availableValues;
        this._publishSubscribeHandler.notifySubscribers(SettingTopic.AVAILABLE_VALUES_CHANGED);
    }
}
