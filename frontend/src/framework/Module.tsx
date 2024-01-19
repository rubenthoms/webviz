import React from "react";

import { cloneDeep } from "lodash";

import { BroadcastChannelsDef, InputBroadcastChannelDef } from "./Broadcaster";
import { InitialSettings } from "./InitialSettings";
import { ModuleBusinessLogic } from "./ModuleBusinessLogic";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { WorkbenchSettings } from "./WorkbenchSettings";

export type ModuleFCProps<S extends StateBaseType, TBusinessLogic extends ModuleBusinessLogic<any> | never = never> = {
    moduleContext: ModuleContext<S, TBusinessLogic>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
    businessLogic: TBusinessLogic;
};

export type ModuleFC<
    S extends StateBaseType,
    TBusinessLogic extends ModuleBusinessLogic<any> | never = never
> = React.FC<ModuleFCProps<S, TBusinessLogic>>;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export class Module<StateType extends StateBaseType, TBusinessLogic extends ModuleBusinessLogic<any> | never = never> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleFC<StateType, TBusinessLogic>;
    public settingsFC: ModuleFC<StateType, TBusinessLogic>;
    protected _importState: ImportState;
    private _moduleInstances: ModuleInstance<StateType, TBusinessLogic>[];
    private _defaultState: StateType | null;
    private _stateOptions: StateOptions<StateType> | undefined;
    private _workbench: Workbench | null;
    private _syncableSettingKeys: SyncSettingKey[];
    private _channelsDef: BroadcastChannelsDef;
    private _drawPreviewFunc: DrawPreviewFunc | null;
    private _description: string | null;
    private _inputChannelDefs: InputBroadcastChannelDef[];
    private _businessLogic: (new (...args: any[]) => TBusinessLogic) | null = null;

    constructor(
        name: string,
        defaultTitle: string,
        syncableSettingKeys: SyncSettingKey[] = [],
        broadcastChannelsDef: BroadcastChannelsDef = {},
        inputChannelDefs: InputBroadcastChannelDef[] = [],
        drawPreviewFunc: DrawPreviewFunc | null = null,
        description: string | null = null,
        businessLogic: (new (...args: any[]) => TBusinessLogic) | null = null
    ) {
        this._name = name;
        this._defaultTitle = defaultTitle;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this._importState = ImportState.NotImported;
        this._moduleInstances = [];
        this._defaultState = null;
        this._workbench = null;
        this._syncableSettingKeys = syncableSettingKeys;
        this._channelsDef = broadcastChannelsDef;
        this._inputChannelDefs = inputChannelDefs;
        this._drawPreviewFunc = drawPreviewFunc;
        this._description = description;
        this._businessLogic = businessLogic;
    }

    getDrawPreviewFunc(): DrawPreviewFunc | null {
        return this._drawPreviewFunc;
    }

    getImportState(): ImportState {
        return this._importState;
    }

    getName(): string {
        return this._name;
    }

    getDefaultTitle(): string {
        return this._defaultTitle;
    }

    getDescription(): string | null {
        return this._description;
    }

    setWorkbench(workbench: Workbench): void {
        this._workbench = workbench;
    }

    setDefaultState(defaultState: StateType, options?: StateOptions<StateType>): void {
        this._defaultState = defaultState;
        this._stateOptions = options;
        this._moduleInstances.forEach((instance) => {
            if (this._defaultState && !instance.isInitialised()) {
                instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
            }
        });
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(instanceNumber: number): ModuleInstance<StateType, TBusinessLogic> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<StateType, any>(
            this,
            instanceNumber,
            this._channelsDef,
            this._workbench,
            this._inputChannelDefs,
            this._businessLogic
        );
        this._moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    private setImportState(state: ImportState): void {
        this._importState = state;
        this._moduleInstances.forEach((instance) => {
            instance.notifySubscribersAboutImportStateChange();
        });

        if (this._workbench && state === ImportState.Imported) {
            this._workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._defaultState && this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (this._defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this._moduleInstances.forEach((instance) => {
                    if (this._defaultState && !instance.isInitialised()) {
                        instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
                    }
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}
