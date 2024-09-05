import React from "react";

import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

export type SettingComponentProps<TValue> = {
    onValueChange: (newValue: TValue) => void;
    value: TValue;
    availableValues: TValue[];
    workbenchSettings: WorkbenchSettings;
    workbenchSession: WorkbenchSession;
};

export class SettingBase<TValue> {
    private _label: string;
    private _value: TValue;

    constructor(label: string, initialValue: TValue) {
        this._label = label;
        this._value = initialValue;
    }

    getLabel(): string {
        return this._label;
    }

    makeComponent(): (props: SettingComponentProps<TValue>) => React.ReactNode {
        throw new Error("Not implemented");
    }
}
