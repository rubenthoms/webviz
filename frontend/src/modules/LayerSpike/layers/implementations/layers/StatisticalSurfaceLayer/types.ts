import { SurfaceStatisticFunction_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";

export type StatisticalSurfaceSettings = {
    [SettingType.ENSEMBLE]: EnsembleIdent | null;
    [SettingType.STATISTIC_FUNCTION]: SurfaceStatisticFunction_api;
    [SettingType.SURFACE_ATTRIBUTE]: string | null;
    [SettingType.SURFACE_NAME]: string | null;
    [SettingType.TIME_OR_INTERVAL]: string | null;
};
