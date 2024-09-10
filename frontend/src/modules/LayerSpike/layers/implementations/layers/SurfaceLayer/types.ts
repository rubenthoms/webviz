import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../../Settings";

export type SurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
};
