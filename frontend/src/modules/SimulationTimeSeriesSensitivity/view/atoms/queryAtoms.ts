import { atomWithQuery } from "@lib/jotai-tanstack-query-debug";

import { Frequency_api, getStatisticalVectorDataPerSensitivityOptions } from "@api";
import { ValidEnsembleRealizationsFunctionAtom } from "@framework/GlobalAtoms";
import { encodeAsUintListStr } from "@lib/utils/queryStringUtils";
import {
    resamplingFrequencyAtom,
    showStatisticsAtom,
    useAtomsAtom,
    vectorSpecificationAtom,
} from "@modules/SimulationTimeSeriesSensitivity/view/atoms/baseAtoms";

export const vectorDataQueryAtom = atomWithQuery((get) => {
    /*
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const queryOptions = getRealizationsVectorDataOptions({
        query: {
            case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
            ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
            vector_name: vectorSpecification?.vectorName ?? "",
            resampling_frequency: resampleFrequency,
            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
        },
    });
    return { ...queryOptions, enabled: false && !!vectorSpecification };
    */

    return {
        queryKey: ["historicalVectorData", { enabled: false }],
        queryFn: async () => {
            return null;
        },
    };
});

export const statisticalVectorSensitivityDataQueryAtom = atomWithQuery((get) => {
    const useAtoms = get(useAtomsAtom);
    const vectorSpecification = get(vectorSpecificationAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);
    const showStatistics = get(showStatisticsAtom);
    const validEnsembleRealizationsFunction = get(ValidEnsembleRealizationsFunctionAtom);

    const fallbackStatisticsResampleFrequency = resampleFrequency ?? Frequency_api.MONTHLY;

    const realizations = vectorSpecification
        ? validEnsembleRealizationsFunction(vectorSpecification?.ensembleIdent)
        : null;
    const realizationsEncodedAsUintListStr = realizations ? encodeAsUintListStr(realizations) : null;

    const queryOptions = getStatisticalVectorDataPerSensitivityOptions({
        query: {
            case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
            ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
            vector_name: vectorSpecification?.vectorName ?? "",
            resampling_frequency: fallbackStatisticsResampleFrequency,
            statistic_functions: undefined,
            realizations_encoded_as_uint_list_str: realizationsEncodedAsUintListStr,
        },
    });
    const enabled = !!(showStatistics && vectorSpecification && useAtoms);
    return { ...queryOptions, enabled };
});

export const historicalVectorDataQueryAtom = atomWithQuery((get) => {
    /*const vectorSpecification = get(vectorSpecificationAtom);
    const showHistorical = get(showHistoricalAtom);
    const resampleFrequency = get(resamplingFrequencyAtom);

    const queryOptions = getHistoricalVectorDataOptions({
        query: {
            case_uuid: vectorSpecification?.ensembleIdent.getCaseUuid() ?? "",
            ensemble_name: vectorSpecification?.ensembleIdent.getEnsembleName() ?? "",
            non_historical_vector_name: vectorSpecification?.vectorName ?? "",
            resampling_frequency: resampleFrequency,
        },
    });

    return { ...queryOptions, enabled: false && !!(showHistorical && vectorSpecification) };
    */

    return {
        queryKey: ["historicalVectorData", { enabled: false }],
        queryFn: async () => {
            return null;
        },
    };
});
