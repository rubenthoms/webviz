import { ColorScaleGradientType } from "@lib/utils/ColorScale";

import { atom } from "jotai";

export const gradientTypeAtom = atom<ColorScaleGradientType>(ColorScaleGradientType.Sequential);

export const optionAtom = atom<string>("");

export const optionsSimulatedAtom = atom<string[]>(["option1", "option2", "option3"]);

export const optionsDerivedAtom = atom<string>((get) => {
    const userSelectedOptions = get(optionAtom);
    const availableOptions = get(optionsSimulatedAtom);

    if (availableOptions.includes(userSelectedOptions)) {
        return userSelectedOptions;
    }

    return availableOptions[0];
});
