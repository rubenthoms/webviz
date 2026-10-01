import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";
import { makeOptionListElevatedSettingOptions } from "../utils/optionListElevatedSetting";

export const REALIZATION_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting(
    makeOptionListElevatedSettingOptions<number, number>({
        key: "realization",
        label: "Realization",
        getOptionValue: (realization) => realization,
        getOptionLabel: (realization) => realization.toString(),
        compareOptions: (a, b) => a - b,
    }),
);
