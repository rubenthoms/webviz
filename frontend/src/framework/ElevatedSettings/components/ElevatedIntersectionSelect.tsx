import { IntersectionType } from "@framework/types/intersection";
import { Combobox } from "@lib/components/Combobox";
import { ComboboxCompositions } from "@lib/components/Combobox/compositions";
import type { ComboboxItem } from "@lib/components/Combobox/types";

import type { ElevatedIntersectionOption, ElevatedIntersectionValue } from "../definitions/intersection";
import type { ElevatedSettingComponentProps } from "../ElevatedSettingDefinition";

// Same labels as the DPF intersection setting's type selector
const TYPE_ITEMS: ComboboxItem<IntersectionType>[] = [
    { value: IntersectionType.WELLBORE, label: "Drilled well trajectory (SMDA)" },
    { value: IntersectionType.PLANNED_WELLBORE, label: "Planned well trajectory (SMDA)" },
    { value: IntersectionType.CUSTOM_POLYLINE, label: "User-defined polyline" },
];

const SOURCE_PLACEHOLDERS: Record<IntersectionType, string> = {
    [IntersectionType.WELLBORE]: "Select wellbore...",
    [IntersectionType.PLANNED_WELLBORE]: "Select planned wellbore...",
    [IntersectionType.CUSTOM_POLYLINE]: "Select polyline...",
};

/**
 * The intersection type (drilled wellbore, planned wellbore or polyline) as a dropdown, and the
 * wellbore/polyline of that type as a combobox with prev/next buttons - for the elevated intersection
 * setting.
 */
export function ElevatedIntersectionSelect(
    props: ElevatedSettingComponentProps<ElevatedIntersectionValue, readonly ElevatedIntersectionOption[]>,
) {
    const optionsOfType = props.constraints.filter((option) => option.type === props.value.type);

    const items: ComboboxItem<string>[] = optionsOfType.map((option) => ({ value: option.uuid, label: option.name }));

    // Keep an invalid value visible instead of rendering an empty selection - skipped by prev/next.
    if (props.value.uuid !== null && !optionsOfType.some((option) => option.uuid === props.value.uuid)) {
        items.unshift({ value: props.value.uuid, label: `${props.value.uuid} (not available)`, disabled: true });
    }

    function handleTypeChange(type: IntersectionType | null) {
        if (type === null || type === props.value.type) {
            return;
        }

        // Switching type is an explicit choice - start out on the first option of the new type
        const firstOptionOfType = props.constraints.find((option) => option.type === type);
        props.onValueChange({ type, uuid: firstOptionOfType?.uuid ?? null });
    }

    function handleSourceChange(uuid: string | null) {
        props.onValueChange({ type: props.value.type, uuid });
    }

    return (
        <div className="gap-y-2xs flex flex-col">
            <Combobox items={TYPE_ITEMS} value={props.value.type} onValueChange={handleTypeChange} />
            <ComboboxCompositions.WithBrowseButtons
                items={items}
                value={props.value.uuid}
                onValueChange={handleSourceChange}
                loading={props.isSettling}
                placeholder={SOURCE_PLACEHOLDERS[props.value.type]}
            />
        </div>
    );
}
