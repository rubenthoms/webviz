import { EnsembleIdent } from "@framework/EnsembleIdent";

import { BaseSetting } from "./BaseSetting";
import { SettingType } from "./SettingTypes";

export class EnsembleSetting extends BaseSetting<EnsembleIdent | null> {
    constructor() {
        super("ensembleIdent", "Ensemble", null, SettingType.ENSEMBLE);
    }
}
