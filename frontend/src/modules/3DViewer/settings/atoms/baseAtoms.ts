import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ColorScale } from "@lib/utils/ColorScale";
import { GridCellIndexRanges } from "@modules/3DViewer/typesAndEnums";

import { atom } from "jotai";

export const showGridlinesAtom = atom<boolean>(false);
export const showIntersectionAtom = atom<boolean>(false);
export const gridLayerAtom = atom<number>(1);
export const intersectionExtensionLengthAtom = atom<number>(1000);
export const colorScaleAtom = atom<ColorScale | null>(null);
export const viewerHorizontalAtom = atom<boolean>(false);

export const useCustomBoundsAtom = atom<boolean>(false);

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedRealizationAtom = atom<number | null>(null);
export const userSelectedGridModelNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterDateOrIntervalAtom = atom<string | null>(null);
export const userSelectedWellboreUuidsAtom = atom<string[]>([]);
export const userSelectedHighlightedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
export const userSelectedGridCellIndexRangesAtom = atom<GridCellIndexRanges | null>(null);
