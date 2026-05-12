import { atom } from "jotai";

export type DatasetType = "vortex" | "spiral" | "saddle" | "convergent" | "helix" | "sphere" | "abc";
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
