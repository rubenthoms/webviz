import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import { userSelectedEnsembleIdentAtom, userSelectedWellboreUuidAtom } from "../settings/atoms/baseAtoms";
import { drilledWellboreHeadersQueryAtom } from "../settings/atoms/queryAtoms";

export const selectedEnsembleIdentAtom = atom<EnsembleIdent | null>((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdent = get(userSelectedEnsembleIdentAtom);

    if (userSelectedEnsembleIdent === null || !ensembleSet.hasEnsemble(userSelectedEnsembleIdent)) {
        return ensembleSet.getEnsembleArr()[0]?.getIdent() || null;
    }

    return userSelectedEnsembleIdent;
});

export const selectedWellboreUuidAtom = atom((get) => {
    const userSelectedWellboreUuid = get(userSelectedWellboreUuidAtom);
    const wellboreHeaders = get(drilledWellboreHeadersQueryAtom);

    if (!wellboreHeaders.data) {
        return null;
    }

    if (
        !userSelectedWellboreUuid ||
        !wellboreHeaders.data.some((el) => el.wellbore_uuid === userSelectedWellboreUuid)
    ) {
        return wellboreHeaders.data[0].wellbore_uuid ?? null;
    }

    return userSelectedWellboreUuid;
});
