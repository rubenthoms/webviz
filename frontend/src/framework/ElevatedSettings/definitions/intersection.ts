import { IntersectionType } from "@framework/types/intersection";

import { ElevatedIntersectionSelect } from "../components/ElevatedIntersectionSelect";
import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";

export type ElevatedIntersectionValue = {
    // Drilled wellbore, planned wellbore or user-defined polyline
    type: IntersectionType;
    // The selected wellbore or polyline of that type
    uuid: string | null;
};

export type ElevatedIntersectionOption = {
    type: IntersectionType;
    uuid: string;
    name: string;
};

function isSameOption(a: ElevatedIntersectionOption, b: ElevatedIntersectionOption): boolean {
    return a.type === b.type && a.uuid === b.uuid;
}

export function getOptionsOfType(
    options: readonly ElevatedIntersectionOption[],
    type: IntersectionType,
): ElevatedIntersectionOption[] {
    return options.filter((option) => option.type === type);
}

export const INTERSECTION_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting<
    ElevatedIntersectionValue,
    readonly ElevatedIntersectionOption[]
>({
    key: "intersection",
    label: "Intersection",
    defaultValue: { type: IntersectionType.WELLBORE, uuid: null },
    initialConstraints: [],
    // Options are compared by type and uuid, so equal-but-distinct option objects from different sources
    // are deduplicated.
    unionConstraints: (a, b) => [...a, ...b.filter((option) => !a.some((existing) => isSameOption(existing, option)))],
    intersectConstraints: (a, b) => a.filter((option) => b.some((other) => isSameOption(other, option))),
    isValueValid: (value, constraints) => {
        const optionsOfType = getOptionsOfType(constraints, value.type);
        if (value.uuid === null) {
            return optionsOfType.length === 0;
        }
        return optionsOfType.some((option) => option.uuid === value.uuid);
    },
    fixupValue: (value, constraints) => ({
        type: value.type,
        uuid: getOptionsOfType(constraints, value.type)[0]?.uuid ?? null,
    }),
    Component: ElevatedIntersectionSelect,
});
