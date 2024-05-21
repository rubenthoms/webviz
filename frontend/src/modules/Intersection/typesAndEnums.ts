import { ColorScale } from "@lib/utils/ColorScale";

import { PolylineIntersection_trans } from "./view/queries/queryDataTransforms";

export enum IntersectionType {
    CUSTOM_POLYLINE = "custom-polyline",
    WELLBORE = "wellbore",
}

export type CustomIntersectionPolyline = {
    id: string;
    name: string;
    polyline: number[][];
};

export enum SeismicDataType {
    SIMULATED = "simulated",
    OBSERVED = "observed",
}

export enum SeismicSurveyType {
    THREE_D = "3D",
    FOUR_D = "4D",
}

export const SeismicDataTypeToStringMapping = {
    [SeismicDataType.SIMULATED]: "Simulated",
    [SeismicDataType.OBSERVED]: "Observed",
};

export const SeismicSurveyTypeToStringMapping = {
    [SeismicSurveyType.THREE_D]: "3D",
    [SeismicSurveyType.FOUR_D]: "4D",
};

export type SeismicSliceImageOptions = {
    datapoints: number[][];
    yAxisValues: number[];
    trajectory: number[][];
    colorScale: ColorScale;
};

export type SeismicSliceImageData = SeismicSliceImageOptions & {
    image: ImageBitmap | null;
};

export enum LayerType {
    GRID = "grid",
    SEISMIC = "seismic",
    SURFACES = "surfaces",
    WELLPICKS = "wellpicks",
}

export const LAYER_TYPE_TO_STRING_MAPPING = {
    [LayerType.GRID]: "Grid",
    [LayerType.SEISMIC]: "Seismic",
    [LayerType.SURFACES]: "Surfaces",
    [LayerType.WELLPICKS]: "Wellpicks",
};

export type LayerBoundingBox = {
    x: [number, number];
    y: [number, number];
};

export interface Layer {
    id: string;
    type: LayerType;
    name: string;
    visible: boolean;
    showSettings: boolean;
    settings: Record<string, unknown>;
    boundingBox: LayerBoundingBox;
}

export enum LayerActionType {
    ADD_LAYER = "add-layer",
    REMOVE_LAYER = "remove-layer",
    TOGGLE_LAYER_VISIBILITY = "toggle-layer-visibility",
    TOGGLE_LAYER_SETTINGS_VISIBILITY = "toggle-layer-settings-visibility",
    UPDATE_SETTING = "update-settings",
    UPDATE_BOUNDING_BOX = "update-bounding-box",
    MOVE_LAYER = "move-layer",
}

export enum LayerStatus {
    IDLE = "idle",
    LOADING = "loading",
    ERROR = "error",
    SUCCESS = "success",
}

export type LayerActionPayloads = {
    [LayerActionType.ADD_LAYER]: { type: LayerType };
    [LayerActionType.REMOVE_LAYER]: { id: string };
    [LayerActionType.TOGGLE_LAYER_VISIBILITY]: { id: string };
    [LayerActionType.TOGGLE_LAYER_SETTINGS_VISIBILITY]: { id: string };
    [LayerActionType.UPDATE_SETTING]: { id: string; settings: Record<string, unknown> };
    [LayerActionType.UPDATE_BOUNDING_BOX]: { id: string; boundingBox: LayerBoundingBox };
    [LayerActionType.MOVE_LAYER]: { id: string; moveToIndex: number };
};

export type LayerAction<T extends LayerActionType> = {
    type: T;
    payload: LayerActionPayloads[T];
};

export type LayerActions = {
    [K in keyof LayerActionPayloads]: LayerActionPayloads[K] extends never
        ? { type: K }
        : { type: K; payload: LayerActionPayloads[K] };
}[keyof LayerActionPayloads];

export interface GridLayer extends Layer {
    type: LayerType.GRID;
    settings: {
        modelName: string | null;
        parameterName: string | null;
        parameterDateOrInterval: string | null;
        colorScale: ColorScale;
    };
}

export interface SeismicLayer extends Layer {
    type: LayerType.SEISMIC;
    settings: {
        surveyType: SeismicSurveyType;
        dataType: SeismicDataType;
        attribute: string | null;
        dateOrInterval: string | null;
    };
}

export type PolylineIntersectionResult = {
    id: string;
    polylineIntersection: PolylineIntersection_trans | undefined;
};

export type CombinedPolylineIntersectionResults = {
    combinedPolylineIntersectionResults: PolylineIntersectionResult[];
    isFetching: boolean;
    someQueriesFailed: boolean;
    allQueriesFailed: boolean;
};
