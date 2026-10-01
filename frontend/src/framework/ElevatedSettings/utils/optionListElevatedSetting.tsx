import { Combobox } from "@lib/components/Combobox";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import type {
    ElevatedSettingComponentProps,
    ElevatedSettingConstraintMode,
    ElevatedSettingOptions,
} from "../ElevatedSettingDefinition";

export type OptionListElevatedSettingConfig<TValue extends string | number, TOption> = {
    key: string;
    label: string;
    getOptionValue: (option: TOption) => TValue;
    getOptionLabel: (option: TOption) => string;
    // Applied to the union of the sources' options, so they don't show up in contribution order.
    compareOptions?: (a: TOption, b: TOption) => number;
    defaultConstraintMode?: ElevatedSettingConstraintMode;
};

// Makes the options for an elevated setting whose value is one of a list of options (identified by
// `getOptionValue`), rendered as a combobox - the common case of realizations, grid models,
// wellbores, ... Only a helper for that one shape: register the result with
// `ElevatedSettingRegistry.registerElevatedSetting`, spreading it to override any part if needed.
export function makeOptionListElevatedSettingOptions<TValue extends string | number, TOption>(
    config: OptionListElevatedSettingConfig<TValue, TOption>,
): ElevatedSettingOptions<TValue | null, readonly TOption[]> {
    const { getOptionValue, getOptionLabel, compareOptions } = config;

    function hasOption(constraints: readonly TOption[], value: TValue): boolean {
        return constraints.some((option) => getOptionValue(option) === value);
    }

    function OptionListComponent(props: ElevatedSettingComponentProps<TValue | null, readonly TOption[]>) {
        const items: ComboboxItem<TValue>[] = props.constraints.map((option) => ({
            value: getOptionValue(option),
            label: getOptionLabel(option),
        }));

        // Keep an invalid value visible instead of rendering an empty selection.
        if (props.value !== null && !hasOption(props.constraints, props.value)) {
            items.unshift({ value: props.value, label: `${props.value} (not available)`, disabled: true });
        }

        return (
            <Combobox
                size="small"
                items={items}
                value={props.value}
                onValueChange={(value) => props.onValueChange(value)}
                loading={props.isSettling}
                placeholder="No value"
            />
        );
    }

    return {
        key: config.key,
        label: config.label,
        defaultValue: null,
        initialConstraints: [],
        defaultConstraintMode: config.defaultConstraintMode,
        // Options are compared by their value, so equal-but-distinct option objects from different
        // sources (e.g. two layers' wellbore headers) are deduplicated.
        unionConstraints: (a, b) => {
            const union = [...a, ...b.filter((option) => !hasOption(a, getOptionValue(option)))];
            return compareOptions ? union.sort(compareOptions) : union;
        },
        intersectConstraints: (a, b) => a.filter((option) => hasOption(b, getOptionValue(option))),
        isValueValid: (value, constraints) => (value === null ? constraints.length === 0 : hasOption(constraints, value)),
        fixupValue: (_value, constraints) => (constraints.length > 0 ? getOptionValue(constraints[0]) : null),
        Component: OptionListComponent,
    };
}
