import type { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";

import type { ColorPreset, ColorScaleSpecification, DatasetType } from "./atoms";
import {
    colorPresetAtom,
    colorScaleSpecificationAtom,
    datasetTypeAtom,
    lineWidthAtom,
    magnitudeOpacityAtom,
    maxAgeAtom,
    numParticlesAtom,
    opacityAtom,
    showMagnitudeOverlayAtom,
    speedFactorAtom,
    timeAtom,
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
    showMagnitudeOverlay: boolean;
    magnitudeOpacity: number;
    colorScaleSpecification: ColorScaleSpecification | null;
    time: number;
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
    showMagnitudeOverlay: (get) => get(showMagnitudeOverlayAtom),
    magnitudeOpacity: (get) => get(magnitudeOpacityAtom),
    colorScaleSpecification: (get) => get(colorScaleSpecificationAtom),
    time: (get) => get(timeAtom),
};
