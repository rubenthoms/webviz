import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";

import { SettingBase, SettingComponentProps } from "../Setting";

export class Ensemble extends SettingBase<EnsembleIdent | null> {
    constructor() {
        super("Ensemble", null);
    }

    makeComponent(): (props: SettingComponentProps<EnsembleIdent | null>) => React.ReactNode {
        return function Ensemble(props: SettingComponentProps<EnsembleIdent | null>) {
            return <div>{props.value ? props.value.getEnsembleName() : "No ensemble selected"}</div>;
        };
    }
}
