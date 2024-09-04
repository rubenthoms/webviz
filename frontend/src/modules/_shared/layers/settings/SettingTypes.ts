export enum SettingType {
    ENSEMBLE = "ensemble",
    SURFACE_NAME = "surfaceName",
}

export const SETTING_TYPE_TO_STRING_MAPPING = {
    [SettingType.ENSEMBLE]: "Ensemble",
    [SettingType.SURFACE_NAME]: "Surface Name",
};
