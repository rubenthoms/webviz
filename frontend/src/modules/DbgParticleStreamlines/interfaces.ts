import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { ColorPreset, DatasetType } from "./atoms";
import {
    colorPresetAtom,
    datasetTypeAtom,
    lineWidthAtom,
    maxAgeAtom,
    numParticlesAtom,
    opacityAtom,
    speedFactorAtom,
    trailLengthAtom,
    trailStepsAtom,
} from "./atoms";

type SettingsToViewInterface = {
    datasetType: DatasetType;
    numParticles: number;
    maxAge: number;
    speedFactor: number;
    opacity: number;
    lineWidth: number;
    trailSteps: number;
    trailLength: number;
    colorPreset: ColorPreset;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    datasetType: (get) => get(datasetTypeAtom),
    numParticles: (get) => get(numParticlesAtom),
    maxAge: (get) => get(maxAgeAtom),
    speedFactor: (get) => get(speedFactorAtom),
    opacity: (get) => get(opacityAtom),
    lineWidth: (get) => get(lineWidthAtom),
    trailSteps: (get) => get(trailStepsAtom),
    trailLength: (get) => get(trailLengthAtom),
    colorPreset: (get) => get(colorPresetAtom),
};
