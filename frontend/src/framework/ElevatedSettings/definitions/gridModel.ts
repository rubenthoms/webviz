import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";
import { makeOptionListElevatedSettingOptions } from "../utils/optionListElevatedSetting";

export const GRID_MODEL_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting(
    makeOptionListElevatedSettingOptions<string, string>({
        key: "gridModel",
        label: "Grid model",
        getOptionValue: (gridName) => gridName,
        getOptionLabel: (gridName) => gridName,
        compareOptions: (a, b) => a.localeCompare(b),
    }),
);
