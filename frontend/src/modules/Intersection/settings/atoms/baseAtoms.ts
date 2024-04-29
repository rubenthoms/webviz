import { EnsembleIdent } from "@framework/EnsembleIdent";
import { SeismicDataType, SeismicSurveyType } from "@modules/Intersection/typesAndEnums";

import { atom } from "jotai";

export const userSelectedEnsembleIdentAtom = atom<EnsembleIdent | null>(null);
export const userSelectedRealizationAtom = atom<number | null>(null);
export const userSelectedGridModelNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterNameAtom = atom<string | null>(null);
export const userSelectedGridModelParameterDateOrIntervalAtom = atom<string | null>(null);
export const userSelectedWellboreUuidAtom = atom<string | null>(null);
export const userSelectedCustomIntersectionPolylineIdAtom = atom<string | null>(null);
export const userSelectedSeismicDataTypeAtom = atom<SeismicDataType>(SeismicDataType.SIMULATED);
export const userSelectedSeismicSurveyTypeAtom = atom<SeismicSurveyType>(SeismicSurveyType.THREE_D);
export const userSelectedSeismicAttributeAtom = atom<string | null>(null);
export const userSelectedSeismicDateOrIntervalStringAtom = atom<string | null>(null);
