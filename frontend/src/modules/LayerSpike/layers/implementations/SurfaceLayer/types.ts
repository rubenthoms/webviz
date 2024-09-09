import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingType } from "../../Settings";

export type SurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.REALIZATION]: number | null;
};
