import React from "react";

import { Select, SelectOption } from "@lib/components/Select";

import { SettingDelegate } from "../../delegates/SettingDelegate";
import { Setting, SettingComponentProps } from "../../interfaces";
import { SettingType } from "../../settingsTypes";

type ValueType = string[];

export type DrilledWellboreIdent = {
    uwi: string;
    uuid: string;
};
export class DrilledWellbores implements Setting<ValueType> {
    private _delegate: SettingDelegate<ValueType> = new SettingDelegate<ValueType>([]);

    getType(): SettingType {
        return SettingType.SMDA_WELLBORE_UUIDS;
    }

    getLabel(): string {
        return "Drilled wellbore trajectories";
    }

    getDelegate(): SettingDelegate<ValueType> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<ValueType>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<ValueType>) {
            const options: SelectOption[] = props.availableValues.map((value) => {
                return {
                    value: value.toString(),
                    label: value === null ? "None" : value.toString(),
                };
            });

            return (
                <Select
                    options={options}
                    value={props.value}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                />
            );
        };
    }
}
