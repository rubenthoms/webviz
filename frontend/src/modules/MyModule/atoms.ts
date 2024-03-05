import { persistableAtom } from "@framework/utils/atomUtils";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { atom } from "jotai";

export const gradientTypeAtom = persistableAtom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);

export const userSelectedOptionAtom = persistableAtom<string>("");

export const availableOptionsAtom = atom<string[]>([]);

export const fixedUpOptionAtom = atom<string>((get) => {
    const userSelectedOptions = get(userSelectedOptionAtom);
    const availableOptions = get(availableOptionsAtom);

    if (availableOptions.includes(userSelectedOptions.state)) {
        return userSelectedOptions.state;
    }

    return availableOptions[0];
});
