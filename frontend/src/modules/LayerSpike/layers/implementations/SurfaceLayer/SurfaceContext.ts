import { SurfaceSettings } from "./types";

import { SettingsContextDelegate } from "../../SettingsContextDelegate";
import { SettingsContext } from "../../interfaces";
import { Ensemble } from "../Ensemble";

export class SurfaceContext implements SettingsContext<SurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<SurfaceSettings>;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<SurfaceSettings>(
            {
                ensemble: new Ensemble(),
            },
            this.checkIfRefetchRequired.bind(this)
        );
    }

    getDelegate(): SettingsContextDelegate<SurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    private checkIfRefetchRequired(): boolean {
        return false;
    }
}
