import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
    userSelectedWellboreHeaderAtom,
} from "./baseAtoms";
import { gridModelInfosQueryAtom, wellHeadersQueryAtom } from "./queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0]?.getIdent() || null;
    }

    return userSelectedEnsembleIdent;
});

export const availableRealizationsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const selectedEnsembleIdent = get(selectedEnsembleIdentAtom);

    if (selectedEnsembleIdent === null) {
        return [];
    }

    let ensembleRealizationFilterFunction = get(EnsembleRealizationFilterFunctionAtom);

    if (ensembleRealizationFilterFunction === null) {
        ensembleRealizationFilterFunction = (ensembleIdent: EnsembleIdent) => {
            return ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
        };
    }

    return ensembleRealizationFilterFunction(selectedEnsembleIdent);
});

export const selectedRealizationAtom = atom((get) => {
    const realizations = get(availableRealizationsAtom);
    const userSelectedRealization = get(userSelectedRealizationAtom);

    if (userSelectedRealization === null || !realizations.includes(userSelectedRealization)) {
        return realizations.at(0) ?? null;
    }

    return userSelectedRealization;
});

export const selectedGridModelNameAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const userSelectedGridModelName = get(userSelectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (
        userSelectedGridModelName === null ||
        !gridModelInfos.data.map((gridModelInfo) => gridModelInfo.grid_name).includes(userSelectedGridModelName)
    ) {
        return gridModelInfos.data[0]?.grid_name || null;
    }

    return userSelectedGridModelName;
});

export const selectedGridModelParameterNameAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const userSelectedGridModelParameterName = get(userSelectedGridModelParameterNameAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    if (
        userSelectedGridModelParameterName === null ||
        !gridModelInfos.data
            .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
            ?.property_info_arr.some(
                (propertyInfo) => propertyInfo.property_name === userSelectedGridModelParameterName
            )
    ) {
        return (
            gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
                ?.property_info_arr[0]?.property_name || null
        );
    }

    return userSelectedGridModelParameterName;
});

export const selectedGridModelParameterDateOrIntervalAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelParameterName = get(selectedGridModelParameterNameAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);
    const userSelectedGridModelParameterDateOrInterval = get(userSelectedGridModelParameterDateOrIntervalAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName || !selectedGridModelParameterName) {
        return null;
    }

    if (
        userSelectedGridModelParameterDateOrInterval === null ||
        !gridModelInfos.data
            .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
            ?.property_info_arr.some(
                (propertyInfo) =>
                    propertyInfo.property_name === selectedGridModelParameterName &&
                    propertyInfo.iso_date_or_interval === userSelectedGridModelParameterDateOrInterval
            )
    ) {
        return (
            gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)
                ?.property_info_arr.find(
                    (propertyInfo) => propertyInfo.property_name === selectedGridModelParameterName
                )?.iso_date_or_interval || null
        );
    }

    return userSelectedGridModelParameterDateOrInterval;
});

export const selectedWellboreHeaderAtom = atom((get) => {
    const userSelectedWellHeader = get(userSelectedWellboreHeaderAtom);
    const wellHeaders = get(wellHeadersQueryAtom);

    if (!wellHeaders.data) {
        return null;
    }

    if (!userSelectedWellHeader || !wellHeaders.data.some((el) => el.wellbore_uuid === userSelectedWellHeader)) {
        return wellHeaders.data[0].well_uuid ?? null;
    }

    return userSelectedWellHeader;
});
