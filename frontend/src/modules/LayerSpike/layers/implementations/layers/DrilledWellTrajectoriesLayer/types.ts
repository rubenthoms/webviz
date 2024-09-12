import { WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";

export type DrilledWellTrajectoriesSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.SMDA_WELLBORE_UUIDS]: WellboreHeader_api[];
};
