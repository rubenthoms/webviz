import { SurfaceSettings } from "./types";

import { SettingType } from "../../Settings";
import { SettingsContextDelegate, SettingsContextDelegateTopic } from "../../SettingsContextDelegate";
import { SettingsContext } from "../../interfaces";
import { Ensemble } from "../Ensemble";
import { Realization } from "../Realization";

export class SurfaceContext implements SettingsContext<SurfaceSettings> {
    private _contextDelegate: SettingsContextDelegate<SurfaceSettings>;

    constructor() {
        this._contextDelegate = new SettingsContextDelegate<SurfaceSettings>(
            {
                [SettingType.ENSEMBLE]: new Ensemble(),
                [SettingType.REALIZATION]: new Realization(),
            },
            this.checkIfRefetchRequired.bind(this)
        );
        this._contextDelegate.makeSubscriberFunction(SettingsContextDelegateTopic.REFETCH_REQUIRED)(
            this.refetchData.bind(this)
        );
    }

    getDelegate(): SettingsContextDelegate<SurfaceSettings> {
        return this._contextDelegate;
    }

    getSettings() {
        return this._contextDelegate.getSettings();
    }

    checkIfRefetchRequired(): boolean {
        return true;
    }

    refetchData() {
        const settings = this.getDelegate().getSettings();

        const workbenchSession = this.getDelegate().getLayerManager().getWorkbenchSession();
        const ensembleSet = workbenchSession.getEnsembleSet();

        this.getDelegate().setAvailableValues(
            SettingType.ENSEMBLE,
            ensembleSet.getEnsembleArr().map((ensemble) => ensemble.getIdent())
        );

        const currentEnsembleIdent = settings[SettingType.ENSEMBLE].getValue();
        if (currentEnsembleIdent !== null) {
            const realizations = workbenchSession
                .getRealizationFilterSet()
                .getRealizationFilterForEnsembleIdent(currentEnsembleIdent)
                .getFilteredRealizations();
            this.getDelegate().setAvailableValues(SettingType.REALIZATION, [...realizations]);
        }
    }
}
