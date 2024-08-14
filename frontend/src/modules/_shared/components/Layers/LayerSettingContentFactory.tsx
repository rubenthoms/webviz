import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleSettingComponent } from "@modules/_shared/components/Layers/settings/components/ensembleSetting";
import { BaseSetting } from "@modules/_shared/layers/settings/BaseSetting";
import { EnsembleSetting } from "@modules/_shared/layers/settings/EnsembleSetting";

export class LayerSettingContentFactory {
    private _ensembleSet: EnsembleSet;
    private _workbenchSession: WorkbenchSession;
    private _workbenchSettings: WorkbenchSettings;

    constructor(ensembleSet: EnsembleSet, workbenchSession: WorkbenchSession, workbenchSettings: WorkbenchSettings) {
        this._ensembleSet = ensembleSet;
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
    }

    createLayerSetting(setting: BaseSetting<any>): React.ReactNode {
        if (setting instanceof EnsembleSetting) {
            return <EnsembleSettingComponent ensembleSet={this._ensembleSet} setting={setting} />;
        }
    }
}
