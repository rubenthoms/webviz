import { cloneDeep } from "lodash";

import { MainModuleInstance } from "./MainModuleInstance";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateOptions } from "./StateStore";
import { SubModuleInstance } from "./SubModuleInstance";
import { Workbench } from "./Workbench";

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

export class Module<StateType extends StateBaseType> {
    private _name: string;
    protected numInstances: number;
    private importState: ImportState;
    protected moduleInstances: ModuleInstance<StateType>[];
    protected initialState: StateType | null;
    protected stateOptions: StateOptions<StateType> | undefined;
    private workbench: Workbench | null;

    constructor(name: string) {
        this._name = name;
        this.numInstances = 0;
        this.importState = ImportState.NotImported;
        this.moduleInstances = [];
        this.workbench = null;
        this.initialState = null;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.initialState = initialState;
        this.stateOptions = options;
        this.initModuleInstances();
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public makeInstance(id?: string): MainModuleInstance<StateType> | SubModuleInstance<any, any> {
        throw new Error("Method not implemented.");
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

    protected maybeImportSelf(): void {
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
