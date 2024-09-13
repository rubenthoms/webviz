import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../../settingsTypes";

export type RealizationFaultPolygonsSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.FAULT_POLYGONS_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.SURFACE_LAYER]: string | null;
};
