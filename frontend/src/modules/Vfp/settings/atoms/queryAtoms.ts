import { atomWithQuery } from "jotai-tanstack-query";

import { getVfpTableNamesOptions, getVfpTableOptions } from "@api";
import { makeCacheBustingQueryParam } from "@framework/utils/queryUtils";

import {
    selectedEnsembleIdentAtom,
    selectedRealizationNumberAtom,
    selectedVfpTableNameAtom,
} from "./persistableFixableAtoms";

export const vfpTableQueryAtom = atomWithQuery((get) => {
    const { value: selectedEnsembleIdent, isValidInContext: ensembleIdentValid } = get(selectedEnsembleIdentAtom);
    const { value: selectedRealizationNumber, isValidInContext: realizationNumberValid } = get(
        selectedRealizationNumberAtom,
    );
    const { value: selectedVfpTableName, isValidInContext: vfpTableNameValid } = get(selectedVfpTableNameAtom);

    const query = {
        ...getVfpTableOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealizationNumber ?? 0,
                vfp_table_name: selectedVfpTableName ?? "",
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealizationNumber !== null &&
                selectedVfpTableName &&
                ensembleIdentValid &&
                realizationNumberValid &&
                vfpTableNameValid,
        ),
    };
    return query;
});

export const vfpTableNamesQueryAtom = atomWithQuery((get) => {
    const { value: selectedEnsembleIdent, isValidInContext: ensembleIdentValid } = get(selectedEnsembleIdentAtom);
    const { value: selectedRealizationNumber, isValidInContext: realizationNumberValid } = get(
        selectedRealizationNumberAtom,
    );

    const query = {
        ...getVfpTableNamesOptions({
            query: {
                case_uuid: selectedEnsembleIdent?.getCaseUuid() ?? "",
                ensemble_name: selectedEnsembleIdent?.getEnsembleName() ?? "",
                realization: selectedRealizationNumber ?? 0,
                ...makeCacheBustingQueryParam(selectedEnsembleIdent),
            },
        }),
        enabled: Boolean(
            selectedEnsembleIdent?.getCaseUuid() &&
                selectedEnsembleIdent?.getEnsembleName() &&
                selectedRealizationNumber !== null &&
                ensembleIdentValid &&
                realizationNumberValid,
        ),
    };
    return query;
});
