import { ColorScaleType } from "@lib/utils/ColorScale";

export type State = {
    type: ColorScaleType;
    min: number;
    max: number;
    divMidPoint: number;
};
