import React from "react";

import { ComponentSizeContext } from "@lib/components/_shared/contexts/componentSizeContext";
import { GroupWithLabels } from "@lib/components/Checkbox/compositions/groupWithLabels";

import type { StaticSettingComponentProps, StaticSettingImplementation } from "../../interfacesAndTypes/customSettingImplementation";

export type FluxPhasesShown = {
    oil: boolean;
    gas: boolean;
    water: boolean;
};

type ValueType = FluxPhasesShown;

const PHASE_OPTIONS = [
    { label: "Oil", value: "oil" },
    { label: "Gas", value: "gas" },
    { label: "Water", value: "water" },
] as const;

export class FluxPhasesShownSetting implements StaticSettingImplementation<ValueType> {
    defaultValue: ValueType = { oil: true, gas: true, water: true };

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
        return typeof v.oil === "boolean" && typeof v.gas === "boolean" && typeof v.water === "boolean";
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
            throw new Error("Invalid FluxPhasesShown value");
        }
        return parsed;
    }

    makeComponent(): (props: StaticSettingComponentProps<ValueType>) => React.ReactNode {
        const fixupFunc = this.fixupValue.bind(this);

        return function FluxPhasesShownSettingComponent(props: StaticSettingComponentProps<ValueType>) {
            const currentValue = fixupFunc(props.value);
            const checkedValues = PHASE_OPTIONS.filter((opt) => currentValue[opt.value]).map((opt) => opt.value);

            function handleValueChange(newCheckedValues: string[]) {
                props.onValueChange({
                    oil: newCheckedValues.includes("oil"),
                    gas: newCheckedValues.includes("gas"),
                    water: newCheckedValues.includes("water"),
                });
            }

            return (
                <ComponentSizeContext.Provider value="small">
                    <GroupWithLabels
                        options={PHASE_OPTIONS as unknown as { label: string; value: string }[]}
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
