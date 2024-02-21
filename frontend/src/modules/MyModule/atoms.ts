import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { atom } from "jotai";

export const gradientTypeAtom = atom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);
