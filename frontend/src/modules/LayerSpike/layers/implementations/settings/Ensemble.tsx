import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { SettingDelegate } from "../../SettingDelegate";
import { SettingType } from "../../Settings";
import { Setting, SettingComponentProps } from "../../interfaces";

export class Ensemble implements Setting<EnsembleIdent | null> {
    private _delegate: SettingDelegate<EnsembleIdent | null> = new SettingDelegate<EnsembleIdent | null>(null);

    getType(): SettingType {
        return SettingType.ENSEMBLE;
    }

    getLabel(): string {
        return "Ensemble";
    }

    getDelegate(): SettingDelegate<EnsembleIdent | null> {
        return this._delegate;
    }

    makeComponent(): (props: SettingComponentProps<EnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<EnsembleIdent | null>) {
            const ensembleSet = useEnsembleSet(props.workbenchSession);

            return (
                <EnsembleDropdown
                    ensembleSet={ensembleSet}
                    value={!props.isOverridden ? props.value : props.overriddenValue}
                    onChange={props.onValueChange}
                    disabled={props.isOverridden}
                    showArrows
                />
            );
        };
    }
}
