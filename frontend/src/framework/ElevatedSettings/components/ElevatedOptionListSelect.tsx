import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import type { ElevatedSettingComponentProps } from "../ElevatedSettingDefinition";

export type ElevatedOptionListSelectProps<TValue extends string | number, TOption> = ElevatedSettingComponentProps<
    TValue | null,
    readonly TOption[]
> & {
    getOptionValue: (option: TOption) => TValue;
    getOptionLabel: (option: TOption) => string;
};

/**
 * The options as a combobox with prev/next buttons - for elevated settings whose value is one of a list of
 * options (see `makeOptionListElevatedSettingOptions`).
 */
export function ElevatedOptionListSelect<TValue extends string | number, TOption>(
    props: ElevatedOptionListSelectProps<TValue, TOption>,
) {
    const { getOptionValue, getOptionLabel } = props;

    const items: ComboboxItem<TValue>[] = props.constraints.map((option) => ({
        value: getOptionValue(option),
        label: getOptionLabel(option),
    }));

    // Keep an invalid value visible instead of rendering an empty selection.
    if (props.value !== null && !props.constraints.some((option) => getOptionValue(option) === props.value)) {
        items.unshift({ value: props.value, label: `${props.value} (not available)`, disabled: true });
    }

    // Prev/next buttons skip disabled items - such as an unavailable value kept visible above.
    return (
        <ComboboxCompositions.WithBrowseButtons
            items={items}
            value={props.value}
            onValueChange={(value) => props.onValueChange(value)}
            placeholder="No value"
        />
    );
}
