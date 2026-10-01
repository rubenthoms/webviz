import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";
import { makeOptionListElevatedSettingOptions } from "../utils/optionListElevatedSetting";

export const GRID_PROPERTY_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting(
    makeOptionListElevatedSettingOptions<string, string>({
        key: "gridProperty",
        label: "Grid property",
        getOptionValue: (propertyName) => propertyName,
        getOptionLabel: (propertyName) => propertyName,
        compareOptions: (a, b) => a.localeCompare(b),
    }),
);
