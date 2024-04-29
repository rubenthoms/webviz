import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleRealizationFilterFunctionAtom, EnsembleSetAtom } from "@framework/GlobalAtoms";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";
import { selectedEnsembleIdentAtom } from "@modules/Intersection/sharedAtoms/sharedAtoms";
import { SeismicDataType, SeismicSurveyType } from "@modules/Intersection/typesAndEnums";

import { atom } from "jotai";

import {
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
    userSelectedSeismicAttributeAtom,
    userSelectedSeismicDataTypeAtom,
    userSelectedSeismicSurveyTypeAtom,
} from "./baseAtoms";
import { gridModelInfosQueryAtom, seismicCubeMetaListQueryAtom } from "./queryAtoms";

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

export const gridModelDimensionsAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    return (
        gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)?.dimensions ??
        null
    );
});

export const selectedGridModelBoundingBox3dAtom = atom((get) => {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const selectedGridModelName = get(selectedGridModelNameAtom);

    if (!gridModelInfos.data) {
        return null;
    }

    if (!selectedGridModelName) {
        return null;
    }

    return gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === selectedGridModelName)?.bbox ?? null;
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

export const availableUserCreatedIntersectionPolylinesAtom = atom((get) => {
    const intersectionPolylines = get(IntersectionPolylinesAtom);
    return intersectionPolylines;
});

export const availableSeismicAttributesAtom = atom((get) => {
    const seismicCubeMetaList = get(seismicCubeMetaListQueryAtom);
    const userSelectedSeismicDataType = get(userSelectedSeismicDataTypeAtom);
    const userSelectedSeismicSurveyType = get(userSelectedSeismicSurveyTypeAtom);

    if (!seismicCubeMetaList.data) {
        return [];
    }

    return Array.from(
        new Set(
            seismicCubeMetaList.data
                .filter((el) => {
                    return (
                        el.is_depth &&
                        el.is_observation === (userSelectedSeismicDataType === SeismicDataType.OBSERVED) &&
                        ((userSelectedSeismicSurveyType === SeismicSurveyType.THREE_D &&
                            !isIsoStringInterval(el.iso_date_or_interval)) ||
                            (userSelectedSeismicSurveyType === SeismicSurveyType.FOUR_D &&
                                isIsoStringInterval(el.iso_date_or_interval)))
                    );
                })
                .map((el) => el.seismic_attribute)
        )
    );
});

export const selectedSeismicAttributeAtom = atom((get) => {
    const userSelectedSeismicAttribute = get(userSelectedSeismicAttributeAtom);
    const availableSeismicAttributes = get(availableSeismicAttributesAtom);

    if (
        !availableSeismicAttributes.some((el) => el === userSelectedSeismicAttribute) ||
        !userSelectedSeismicAttribute
    ) {
        return availableSeismicAttributes[0] || null;
    }

    return userSelectedSeismicAttribute;
});

export const availableSeismicDateOrIntervalStringsAtom = atom((get) => {
    const seismicCubeMetaList = get(seismicCubeMetaListQueryAtom);
    const userSelectedSeismicAttribute = get(selectedSeismicAttributeAtom);
    const userSelectedSeismicDataType = get(userSelectedSeismicDataTypeAtom);
    const userSelectedSeismicSurveyType = get(userSelectedSeismicSurveyTypeAtom);

    if (!seismicCubeMetaList.data) {
        return [];
    }

    return Array.from(
        new Set(
            seismicCubeMetaList.data
                .filter((el) => {
                    return (
                        el.is_depth &&
                        el.seismic_attribute === userSelectedSeismicAttribute &&
                        el.is_observation === (userSelectedSeismicDataType === SeismicDataType.OBSERVED) &&
                        ((userSelectedSeismicSurveyType === SeismicSurveyType.THREE_D &&
                            !isIsoStringInterval(el.iso_date_or_interval)) ||
                            (userSelectedSeismicSurveyType === SeismicSurveyType.FOUR_D &&
                                isIsoStringInterval(el.iso_date_or_interval)))
                    );
                })
                .map((el) => el.iso_date_or_interval)
        )
    );
});

export const selectedSeismicDateOrIntervalStringAtom = atom((get) => {
    const userSelectedSeismicDateOrIntervalString = get(userSelectedGridModelParameterDateOrIntervalAtom);
    const availableSeismicDateOrIntervalStrings = get(availableSeismicDateOrIntervalStringsAtom);

    if (
        !availableSeismicDateOrIntervalStrings.some((el) => el === userSelectedSeismicDateOrIntervalString) ||
        !userSelectedSeismicDateOrIntervalString
    ) {
        return availableSeismicDateOrIntervalStrings[0] || null;
    }

    return userSelectedSeismicDateOrIntervalString;
});
