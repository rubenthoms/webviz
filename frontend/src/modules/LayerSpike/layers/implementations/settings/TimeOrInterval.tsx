import React from "react";

import { Dropdown, DropdownOption } from "@lib/components/Dropdown";

import { SettingDelegate } from "../../SettingDelegate";
import { SettingType } from "../../Settings";
import { Setting, SettingComponentProps } from "../../interfaces";

type ValueType = string | null;

export class TimeOrInterval implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType> = new SettingDelegate<ValueType>(null);

    getType(): SettingType {
        return SettingType.TIME_OR_INTERVAL;
    }

    getLabel(): string {
        return "Time";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
            const options: DropdownOption[] = props.availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });

            return (
                <Dropdown
                    options={options}
                    value={!props.isOverridden ? props.value?.toString() : props.overriddenValue?.toString()}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
