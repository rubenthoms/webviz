import { TIME_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/time";
import type { ElevatedSettingDefinition } from "@framework/ElevatedSettings/ElevatedSettingDefinition";
import { isoStringToTimestampUtcMs } from "@framework/utils/timestampUtils";

/**
 * Connects a DPF setting type to an elevated setting. While the elevated setting is active on the
 * dashboard, every setting of this type contributes its value constraints to it, and uses the elevated
 * value instead of its own (local) one - which is kept, and used again once the setting is no longer
 * elevated.
 */
export type DpfElevatedSettingAdapter<TInternalValue, TValueConstraints, TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;

    // Not called for static settings, which have no value constraints to contribute. Return `null` when
    // this setting has no opinion on the elevated setting's options.
    mapValueConstraintsToElevatedConstraints: (valueConstraints: TValueConstraints) => TElevatedConstraints | null;

    // Maps the elevated value onto this setting's internal value, which then goes through the setting's
    // own validation, external value mapping and representation - just like a locally chosen value.
    // `localValue` allows keeping the parts of the local value the elevated setting doesn't cover.
    mapElevatedValueToInternalValue: (
        elevatedValue: TElevatedValue,
        valueConstraints: TValueConstraints,
        localValue: TInternalValue,
    ) => TInternalValue;

    // Whether the setting follows the elevated value at all, given its own (local) value - e.g. only when
    // it has picked the same kind of value. While it doesn't, it keeps its local value and isn't shown as
    // controlled, but still contributes its constraints. Defaults to always following.
    followsElevatedValue?: (elevatedValue: TElevatedValue, localValue: TInternalValue) => boolean;

    // Keeps the setting's own component editable while it is controlled, instead of showing a read-only
    // representation. The component is told via `isControlledByElevatedSetting`, and must itself disable
    // what the elevated setting controls - e.g. so a controlled setting can still switch to a kind of value
    // it doesn't follow.
    keepsComponentEditableWhileControlled?: boolean;
};

// For settings whose internal value and constraints already have the elevated setting's shape.
export function makeIdentityDpfElevatedSettingAdapter<TValue, TConstraints>(
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): DpfElevatedSettingAdapter<TValue, TConstraints, TValue, TConstraints> {
    return {
        definition,
        mapValueConstraintsToElevatedConstraints: (valueConstraints) => valueConstraints,
        mapElevatedValueToInternalValue: (elevatedValue) => elevatedValue,
    };
}

// Time options are ISO strings, possibly mixed with intervals or "NO_TIME" - only actual time points
// parse to a timestamp.
function isTimePoint(option: string): boolean {
    return !Number.isNaN(isoStringToTimestampUtcMs(option));
}

// For settings with ISO time string options (`TIME_POINT`, `TIME_OR_INTERVAL`): contributes the time
// points as timestamps, and maps the elevated time back onto the option with the same timestamp. A
// setting without any time point options (e.g. a static grid property) has no opinion and keeps its own
// value.
export function makeTimePointDpfElevatedSettingAdapter(): DpfElevatedSettingAdapter<
    string | null,
    string[],
    number | null,
    readonly number[]
> {
    return {
        definition: TIME_ELEVATED_SETTING,
        mapValueConstraintsToElevatedConstraints: (valueConstraints) => {
            const timePoints = valueConstraints.filter(isTimePoint);
            return timePoints.length > 0 ? timePoints.map(isoStringToTimestampUtcMs) : null;
        },
        mapElevatedValueToInternalValue: (elevatedValue, valueConstraints, localValue) => {
            const timePoints = valueConstraints.filter(isTimePoint);
            if (timePoints.length === 0) {
                return localValue;
            }
            if (elevatedValue === null) {
                return null;
            }

            return timePoints.find((option) => isoStringToTimestampUtcMs(option) === elevatedValue) ?? null;
        },
    };
}
