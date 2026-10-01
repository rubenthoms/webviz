import { ElevatedSettingRegistry } from "../ElevatedSettingRegistry";
import { makeOptionListElevatedSettingOptions } from "../utils/optionListElevatedSetting";

export type WellboreElevatedSettingOption = {
    uuid: string;
    name: string;
};

export const WELLBORE_ELEVATED_SETTING = ElevatedSettingRegistry.registerElevatedSetting(
    makeOptionListElevatedSettingOptions<string, WellboreElevatedSettingOption>({
        key: "wellbore",
        label: "Wellbore",
        getOptionValue: (wellbore) => wellbore.uuid,
        getOptionLabel: (wellbore) => wellbore.name,
        compareOptions: (a, b) => a.name.localeCompare(b.name),
    }),
);
