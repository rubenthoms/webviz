import { Ensemble } from "./Ensemble";

import { SettingsContextHelper } from "../SettingsContext";
import { SettingsContext } from "../interfaces";

export class SurfaceContext implements SettingsContext {
    private _contextHelper: SettingsContextHelper;

    constructor() {
        this._contextHelper = new SettingsContextHelper(this.checkIfRefetchRequired);
        this._contextHelper.addSetting(new Ensemble());
    }

    getSettings() {
        return this._contextHelper.getSettings();
    }

    private checkIfRefetchRequired(): boolean {
        return false;
    }
}
