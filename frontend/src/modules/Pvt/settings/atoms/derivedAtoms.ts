import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";
import { isEqual } from "lodash";

import { userSelectedEnsembleIdentsAtom, userSelectedPvtNumsAtom, userSelectedRealizationsAtom } from "./baseAtoms";
import { pvtDataQueriesAtom } from "./queryAtoms";

import { PvtDataAccessor } from "../../utils/PvtDataAccessor";
import { computeRealizationsIntersection } from "../../utils/realizationsIntersection";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);

    let computedEnsembleIdents = userSelectedEnsembleIdents.value.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }

    return computedEnsembleIdents;
});

export const selectedRealizationsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedRealizations = get(userSelectedRealizationsAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);
    let ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    const areAllEnsemblesValid = selectedEnsembleIdents.every((ensembleIdent) =>
        ensembleSet.hasEnsemble(ensembleIdent)
    );

    if (!areAllEnsemblesValid) {
        return [];
    }

    if (ensembleRealizationFilterFunction === null) {
        ensembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    const realizations = computeRealizationsIntersection(selectedEnsembleIdents, ensembleRealizationFilterFunction);

    let computedRealizations = userSelectedRealizations.value.filter((el) => realizations.includes(el));
    if (computedRealizations.length === 0 && realizations.length > 0) {
        computedRealizations = [realizations[0]];
    }

    return computedRealizations;
});

export const pvtDataAccessorAtom = atom((get) => {
    const pvtDataQueries = get(pvtDataQueriesAtom);
    if (pvtDataQueries.tableCollections.length === 0) {
        return new PvtDataAccessor([]);
    }

    const tableCollections = pvtDataQueries.tableCollections;

    return new PvtDataAccessor(tableCollections);
});

export const selectedPvtNumsAtom = atom<number[]>((get) => {
    const userSelectedPvtNums = get(userSelectedPvtNumsAtom).value;
    const pvtDataAccessor = get(pvtDataAccessorAtom);

    const uniquePvtNums = pvtDataAccessor.getUniquePvtNums();

    let computedPvtNums = userSelectedPvtNums.filter((el) => uniquePvtNums.includes(el));

    if (computedPvtNums.length === 0) {
        if (uniquePvtNums.length > 0) {
            computedPvtNums = [uniquePvtNums[0]];
        } else {
            computedPvtNums = [];
        }
    }

    return computedPvtNums;
});

export const selectedEnsembleIdentsAreValidAtom = atom((get) => {
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);
    const selectedEnsembleIdents = get(selectedEnsembleIdentsAtom);

    return (
        userSelectedEnsembleIdents.isPersistedValue &&
        !isEqual(userSelectedEnsembleIdents.value, selectedEnsembleIdents)
    );
});

export const selectedRealizationsAreValidAtom = atom((get) => {
    const userSelectedRealizations = get(userSelectedRealizationsAtom);
    const selectedRealizations = get(selectedRealizationsAtom);

    return userSelectedRealizations.isPersistedValue && !isEqual(userSelectedRealizations.value, selectedRealizations);
});
