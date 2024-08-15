export enum LayerType {
    SURFACE = "surface",
    WELLBORE_SMDA = "wellbore_drilled",
}

export const LAYER_TYPE_TO_STRING_MAPPING = {
    [LayerType.SURFACE]: "Surface",
    [LayerType.WELLBORE_SMDA]: "Wells (Drilled)",
};
