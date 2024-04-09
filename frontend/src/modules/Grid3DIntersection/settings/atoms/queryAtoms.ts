import { apiService } from "@framework/ApiService";

import { atomWithQuery } from "jotai-tanstack-query";

import { selectedEnsembleIdentAtom, selectedRealizationAtom } from "./derivedAtoms";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const gridModelInfosQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);
    const realizationNumber = get(selectedRealizationAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";
    const ensembleName = ensembleIdent?.getEnsembleName() ?? "";

    return {
        queryKey: ["getGridModelInfos", caseUuid, ensembleName, realizationNumber],
        queryFn: () => apiService.grid3D.getGridModelsInfo(caseUuid, ensembleName, realizationNumber ?? 0),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid && ensembleName && realizationNumber !== null),
    };
});

export const wellHeadersQueryAtom = atomWithQuery((get) => {
    const ensembleIdent = get(selectedEnsembleIdentAtom);

    const caseUuid = ensembleIdent?.getCaseUuid() ?? "";

    return {
        queryKey: ["getWellHeaders", caseUuid],
        queryFn: () => apiService.well.getWellHeaders(caseUuid),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid),
    };
});
