import React from "react";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { GroupWithLabels } from "@lib/components/Checkbox/compositions/groupWithLabels";

import type { StaticSettingComponentProps, StaticSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";

export type FluxDirectionsShown = {
    i: boolean;
    j: boolean;
    k: boolean;
};

type ValueType = FluxDirectionsShown;

const DIRECTION_OPTIONS = [
    { label: "I", value: "i" },
    { label: "J", value: "j" },
    { label: "K", value: "k" },
] as const;

export class FluxDirectionsShownSetting implements StaticSettingImplementation<ValueType> {
    defaultValue: ValueType = { i: true, j: true, k: true };

    mapInternalToExternalValue(internalValue: ValueType): ValueType {
        return internalValue;
    }

    getIsStatic(): true {
        return true;
    }

    isValueValidStructure(value: unknown): value is ValueType {
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
            return false;
        }
        const v = value as Record<string, unknown>;
        return typeof v.i === "boolean" && typeof v.j === "boolean" && typeof v.k === "boolean";
    }

    fixupValue(value: ValueType): ValueType {
        if (!this.isValueValidStructure(value)) {
            return this.defaultValue;
        }
        return value;
    }

    serializeValue(value: ValueType): string {
        return JSON.stringify(value);
    }

    deserializeValue(serializedValue: string): ValueType {
        const parsed = JSON.parse(serializedValue);
        if (!this.isValueValidStructure(parsed)) {
            throw new Error("Invalid FluxDirectionsShown value");
        }
        return parsed;
    }

    makeComponent(): (props: StaticSettingComponentProps<ValueType>) => React.ReactNode {
        const fixupFunc = this.fixupValue.bind(this);

        return function FluxDirectionsShownSettingComponent(props: StaticSettingComponentProps<ValueType>) {
            const currentValue = fixupFunc(props.value);
            const checkedValues = DIRECTION_OPTIONS.filter((opt) => currentValue[opt.value]).map((opt) => opt.value);

            function handleValueChange(newCheckedValues: string[]) {
                props.onValueChange({
                    i: newCheckedValues.includes("i"),
                    j: newCheckedValues.includes("j"),
                    k: newCheckedValues.includes("k"),
                });
            }

            return (
                <ComponentSizeContext.Provider value="small">
                    <GroupWithLabels
                        options={DIRECTION_OPTIONS as unknown as { label: string; value: string }[]}
                        layout="horizontal"
                        value={checkedValues}
                        onValueChange={handleValueChange}
                        disabled={props.disabled}
                    />
                </ComponentSizeContext.Provider>
            );
        };
    }
}
