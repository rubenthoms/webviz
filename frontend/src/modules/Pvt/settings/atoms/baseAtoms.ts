import { EnsembleIdent } from "@framework/EnsembleIdent";
import { persistableAtom } from "@framework/utils/atomUtils";

import { isEqual } from "lodash";

function ensembleIdentsListsAreEqual(a: EnsembleIdent[], b: EnsembleIdent[]) {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (!a[i].equals(b[i])) {
            return false;
        }
    }
    return true;
}

export const userSelectedEnsembleIdentsAtom = persistableAtom<EnsembleIdent[]>([], ensembleIdentsListsAreEqual);
export const userSelectedRealizationsAtom = persistableAtom<number[]>([], isEqual);
export const userSelectedPvtNumsAtom = persistableAtom<number[]>([], isEqual);
