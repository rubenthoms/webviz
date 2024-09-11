export enum LayerType {
    SURFACE = "surface",
}

export const LAYER_TYPE_TO_STRING_MAPPING: Record<LayerType, string> = {
    [LayerType.SURFACE]: "Surface",
};

export enum SharedSettingType {
    ENSEMBLE = "ensemble",
    REALIZATION = "realization",
}

export const SHARED_SETTING_TYPE_TO_STRING_MAPPING: Record<SharedSettingType, string> = {
    [SharedSettingType.ENSEMBLE]: "Ensemble",
    [SharedSettingType.REALIZATION]: "Realization",
};
