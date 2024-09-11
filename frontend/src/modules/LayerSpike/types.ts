export enum LayerType {
    OBSERVED_SURFACE = "observedSurface",
    STATISTICAL_SURFACE = "statisticalSurface",
    REALIZATION_SURFACE = "realizationSurface",
}

export const LAYER_TYPE_TO_STRING_MAPPING: Record<LayerType, string> = {
    [LayerType.OBSERVED_SURFACE]: "Observed Surface",
    [LayerType.STATISTICAL_SURFACE]: "Statistical Surface",
    [LayerType.REALIZATION_SURFACE]: "Realization Surface",
};

export enum SharedSettingType {
    ENSEMBLE = "ensemble",
    REALIZATION = "realization",
}

export const SHARED_SETTING_TYPE_TO_STRING_MAPPING: Record<SharedSettingType, string> = {
    [SharedSettingType.ENSEMBLE]: "Ensemble",
    [SharedSettingType.REALIZATION]: "Realization",
};
