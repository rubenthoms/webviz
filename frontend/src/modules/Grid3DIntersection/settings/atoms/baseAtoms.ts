import { EnsembleIdent } from "@framework/EnsembleIdent";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedRealizationAtom = atom<number | null>(null);
export const userSelectedGridModelNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterDateOrIntervalAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
