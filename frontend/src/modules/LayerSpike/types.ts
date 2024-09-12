export enum LayerType {
    OBSERVED_SURFACE = "observedSurface",
    STATISTICAL_SURFACE = "statisticalSurface",
    REALIZATION_SURFACE = "realizationSurface",
    REALIZATION_FAULT_POLYGONS = "realizationFaultPolygons",
    DRILLED_WELLBORE_TRAJECTORIES = "drilledWellTrajectories",
}

export const LAYER_TYPE_TO_STRING_MAPPING: Record<LayerType, string> = {
    [LayerType.OBSERVED_SURFACE]: "Observed Surface",
    [LayerType.STATISTICAL_SURFACE]: "Statistical Surface",
    [LayerType.REALIZATION_SURFACE]: "Realization Surface",
    [LayerType.REALIZATION_FAULT_POLYGONS]: "Fault Polygons",
    [LayerType.DRILLED_WELLBORE_TRAJECTORIES]: "Drilled Well Trajectories",
};

export enum SharedSettingType {
    ENSEMBLE = "ensemble",
    REALIZATION = "realization",
    SURFACE_ATTRIBUTE = "surfaceAttribute",
    SURFACE_NAME = "surfaceName",
}

export const SHARED_SETTING_TYPE_TO_STRING_MAPPING: Record<SharedSettingType, string> = {
    [SharedSettingType.ENSEMBLE]: "Ensemble",
    [SharedSettingType.REALIZATION]: "Realization",
    [SharedSettingType.SURFACE_ATTRIBUTE]: "Surface Attribute",
    [SharedSettingType.SURFACE_NAME]: "Surface Name",
};
