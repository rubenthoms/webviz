import React from "react";

import { cloneDeep } from "lodash";

import { ModuleContext, ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateOptions } from "./StateStore";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFCProps<S extends StateBaseType> = {
    moduleContext: ModuleContext<S>;
    workbenchServices: WorkbenchServices;
};

export type ModuleFC<S extends StateBaseType> = React.FC<ModuleFCProps<S>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export enum ModuleType {
    MainModule,
    SubModule,
}

export class ModuleBase<StateType extends StateBaseType> {
    private _name: string;
    private numInstances: number;
    private importState: ImportState;
    private moduleInstances: ModuleInstance<StateType>[];
    protected initialState: StateType | null;
    protected stateOptions: StateOptions<StateType> | undefined;
    private workbench: Workbench | null;
    public viewFC: ModuleFC<StateType>;
    public settingsFC: ModuleFC<StateType> | null;

    constructor(name: string) {
        this._name = name;
        this.numInstances = 0;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.workbench = null;
        this.initialState = null;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = null;
    }

    public getImportState(): ImportState {
        return this.importState;
    }

    public getType(): ModuleType {
        throw new Error("Method not implemented.");
    }

    public getName() {
        return this._name;
    }

    public setWorkbench(workbench: Workbench): void {
        this.workbench = workbench;
    }

    public getViewFC(): ModuleFC<StateType> {
        return this.viewFC;
    }

    public getSettingsFC(): ModuleFC<StateType> | null {
        return this.settingsFC;
    }

    public makeInstance(id?: string): ModuleInstance<StateType> {
        const instance = new ModuleInstance<StateType>(this, this.numInstances++, id);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this.importState = state;
        this.moduleInstances.forEach((instance) => {
            instance.notifySubscribersAboutImportStateChange();
        });

        if (this.workbench && state === ImportState.Imported) {
            this.workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    protected initModuleInstances(): void {
        this.moduleInstances.forEach((instance) => {
            if (this.initialState && !instance.isInitialised()) {
                instance.setInitialState(cloneDeep(this.initialState), cloneDeep(this.stateOptions));
            }
        });
    }

    private maybeImportSelf(): void {
        if (this.importState !== ImportState.NotImported) {
            if (this.initialState && this.importState === ImportState.Imported) {
                this.initModuleInstances();
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this.initModuleInstances();
            })
            .catch(() => {
                this.setImportState(ImportState.Failed);
            });
    }
}
