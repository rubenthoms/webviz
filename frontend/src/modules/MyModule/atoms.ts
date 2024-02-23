import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";

export const gradientTypeAtom = atom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);
