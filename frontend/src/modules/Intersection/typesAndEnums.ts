import { ColorScale } from "@lib/utils/ColorScale";

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
