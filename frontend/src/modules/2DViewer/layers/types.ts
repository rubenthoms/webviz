export enum LayerType {
    SURFACE = "surface",
    WELLBORE = "wellbore",
}

export const LAYER_TYPE_TO_STRING_MAPPING = {
    [LayerType.SURFACE]: "Surface",
    [LayerType.WELLBORE]: "Wellbore",
};
