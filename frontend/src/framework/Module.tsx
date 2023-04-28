import React from "react";

import { cloneDeep } from "lodash";

import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleBase, ModuleFC, ModuleType } from "./ModuleBase";
import { StateBaseType, StateOptions } from "./StateStore";

export class Module<StateType extends StateBaseType> extends ModuleBase<StateType> {
    private compatibleSubModuleNames: string[];

    constructor(name: string, compatibleSubModuleNames: string[] = []) {
        super(name);
        super.settingsFC = () => <div>Not defined</div>;
        this.compatibleSubModuleNames = compatibleSubModuleNames;
    }

    public getType(): ModuleType {
        return ModuleType.MainModule;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.initialState = initialState;
        this.stateOptions = options;
        super.initModuleInstances();
    }

    public getCompatibleSubModuleNames(): string[] {
        return this.compatibleSubModuleNames;
    }
}
