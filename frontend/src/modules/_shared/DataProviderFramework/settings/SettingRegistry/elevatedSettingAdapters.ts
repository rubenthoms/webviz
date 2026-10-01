import type { WellboreElevatedSettingOption } from "@framework/ElevatedSettings/definitions/wellbore";
import { WELLBORE_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/wellbore";
import type {
    ElevatedSettingConstraintMode,
    ElevatedSettingDefinition,
} from "@framework/ElevatedSettings/ElevatedSettingDefinition";
import { IntersectionType } from "@framework/types/intersection";

import type { IntersectionSettingOption, IntersectionSettingValue } from "../implementations/IntersectionSetting";

/**
 * Connects a DPF setting type to an elevated setting. While the elevated setting is active on the
 * dashboard, every setting of this type contributes its value constraints to it, and uses the elevated
 * value instead of its own (local) one - which is kept, and used again once the setting is no longer
 * elevated.
 */
export type DpfElevatedSettingAdapter<TInternalValue, TValueConstraints, TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;

    // The mode settings of this type contribute with. Defaults to the definition's default mode.
    constraintMode?: ElevatedSettingConstraintMode;

    // Not called for static settings, which have no value constraints to contribute.
    mapValueConstraintsToElevatedConstraints: (valueConstraints: TValueConstraints) => TElevatedConstraints;

    // Maps the elevated value onto this setting's internal value, which then goes through the setting's
    // own validation, external value mapping and representation - just like a locally chosen value.
    // `localValue` allows keeping the parts of the local value the elevated setting doesn't cover.
    mapElevatedValueToInternalValue: (
        elevatedValue: TElevatedValue,
        valueConstraints: TValueConstraints,
        localValue: TInternalValue,
    ) => TInternalValue;
};

// For settings whose internal value and constraints already have the elevated setting's shape.
export function makeIdentityDpfElevatedSettingAdapter<TValue, TConstraints>(
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
    constraintMode?: ElevatedSettingConstraintMode,
): DpfElevatedSettingAdapter<TValue, TConstraints, TValue, TConstraints> {
    return {
        definition,
        constraintMode,
        mapValueConstraintsToElevatedConstraints: (valueConstraints) => valueConstraints,
        mapElevatedValueToInternalValue: (elevatedValue) => elevatedValue,
    };
}

// The elevated wellbore setting only covers drilled wellbores (by uuid) - the intersection setting's
// polyline and planned wellbore options don't contribute, and its extension length is kept local.
export function makeIntersectionWellboreElevatedSettingAdapter(
    defaultExtensionLength: number,
): DpfElevatedSettingAdapter<
    IntersectionSettingValue | null,
    IntersectionSettingOption[],
    string | null,
    readonly WellboreElevatedSettingOption[]
> {
    return {
        definition: WELLBORE_ELEVATED_SETTING,
        mapValueConstraintsToElevatedConstraints: (valueConstraints) =>
            valueConstraints
                .filter((option) => option.type === IntersectionType.WELLBORE)
                .map((option) => ({ uuid: option.uuid, name: option.name })),
        mapElevatedValueToInternalValue: (elevatedValue, valueConstraints, localValue) => {
            if (elevatedValue === null) {
                return null;
            }

            const option = valueConstraints.find(
                (candidate) => candidate.type === IntersectionType.WELLBORE && candidate.uuid === elevatedValue,
            );
            if (!option) {
                return null;
            }

            return {
                type: IntersectionType.WELLBORE,
                name: option.name,
                uuid: option.uuid,
                extensionLength:
                    localValue?.type === IntersectionType.WELLBORE
                        ? localValue.extensionLength
                        : defaultExtensionLength,
            };
        },
    };
}
