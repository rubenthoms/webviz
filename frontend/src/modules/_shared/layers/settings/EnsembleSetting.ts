import { EnsembleIdent } from "@framework/EnsembleIdent";

import { BaseSetting } from "./BaseSetting";

export class EnsembleSetting extends BaseSetting<EnsembleIdent | null> {
    constructor() {
        super("ensembleIdent", "Ensemble", null);
    }
}
