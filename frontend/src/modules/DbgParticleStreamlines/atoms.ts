import { atom } from "jotai";

import type { ColorScaleSpecification } from "@framework/components/ColorScaleSelector/colorScaleSelector";

export type { ColorScaleSpecification };

export type DatasetType = "vortex" | "spiral" | "saddle" | "convergent" | "helix" | "sphere" | "abc" | "wave" | "lorenz" | "tornado";
export type ColorPreset = "orange" | "blue" | "cyan" | "green" | "white";

export const datasetTypeAtom = atom<DatasetType>("spiral");
export const numParticlesAtom = atom<number>(300);
export const maxAgeAtom = atom<number>(2);
export const speedFactorAtom = atom<number>(1);
export const opacityAtom = atom<number>(0.85);
export const lineWidthAtom = atom<number>(2);
export const trailStepsAtom = atom<number>(8);
export const trailLengthAtom = atom<number>(0.15);
export const colorPresetAtom = atom<ColorPreset>("orange");
export const showMagnitudeOverlayAtom = atom<boolean>(true);
export const magnitudeOpacityAtom = atom<number>(0.5);
export const colorScaleSpecificationAtom = atom<ColorScaleSpecification | null>(null);
export const timeAtom = atom<number>(0);
