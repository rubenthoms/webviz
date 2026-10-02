import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

import { ElevatedTimeSlider } from "../components/ElevatedTimeSlider";
import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";
import { makeOptionListElevatedSettingOptions } from "../utils/optionListElevatedSetting";

// A point in time, as a UTC timestamp in milliseconds - consumers format their times differently (with
// or without time part or timezone), so they contribute and match timestamps rather than ISO strings
// (see `isoStringToTimestampUtcMs`).
export const TIME_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting({
    ...makeOptionListElevatedSettingOptions<number, number>({
        key: "time",
        label: "Time",
        getOptionValue: (timestampUtcMs) => timestampUtcMs,
        getOptionLabel: (timestampUtcMs) => timestampUtcMsToCompactIsoString(timestampUtcMs),
        compareOptions: (a, b) => a - b,
    }),
    Component: ElevatedTimeSlider,
});
