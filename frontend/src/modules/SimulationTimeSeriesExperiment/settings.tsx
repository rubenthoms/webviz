import React from "react";

import { ModuleFCProps } from "@framework/Module";

import { BusinessLogicState } from "./businessLogic";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function Settings({ moduleContext, workbenchSession, workbenchServices }: ModuleFCProps<State>) {
    const state = React.useSyncExternalStore<BusinessLogicState>();
}
