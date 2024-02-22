import React from "react";

import { JTDDataType } from "ajv/dist/core";
import { Atom, WritableAtom } from "jotai";
import { cloneDeep } from "lodash";

import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { SettingsContext, ViewContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceBaseType, InterfaceHydration } from "./UniDirectionalSettingsToViewInterface";
import { Workbench } from "./Workbench";
import { WorkbenchServices } from "./WorkbenchServices";
import { WorkbenchSession } from "./WorkbenchSession";
import { WorkbenchSettings } from "./WorkbenchSettings";

export type ModuleSettingsProps<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSerializedStateDef extends JTDBaseType = Record<string, never>
> = {
    settingsContext: SettingsContext<TTStateType, TInterfaceType, TSerializedStateDef>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleViewProps<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    },
    TSerializedStateDef extends JTDBaseType = Record<string, never>
> = {
    viewContext: ViewContext<TTStateType, TInterfaceType, TSerializedStateDef>;
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
};

export type ModuleSettings<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    }
> = React.FC<ModuleSettingsProps<TTStateType, TInterfaceType>>;

export type ModuleView<
    TTStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType = {
        baseStates: Record<string, never>;
        derivedStates: Record<string, never>;
    }
> = React.FC<ModuleViewProps<TTStateType, TInterfaceType>>;

export type JTDBaseType = Record<string, unknown>;

export type MakeReadonly<T> = {
    readonly [P in keyof T]: T[P];
};

export type ModuleStateSerializer<TStateType extends StateBaseType, JTDType extends JTDDataType<JTDBaseType>> = (
    getStateValue: <T extends keyof TStateType>(key: T) => TStateType[T],
    getAtomValue: <T>(atom: Atom<T>) => T
) => JTDType;

export type ModuleStateDeserializer<TStateType extends StateBaseType, JTDType extends JTDDataType<JTDBaseType>> = (
    data: JTDType,
    setStateValue: <T extends keyof TStateType>(key: T, value: TStateType[T]) => void,
    setAtomValue: <Value_1, Args extends unknown[], Result>(
        atom: WritableAtom<Value_1, Args, Result>,
        ...args: Args
    ) => Result
) => void;

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export interface ModuleOptions<TSerializedStateDef extends JTDBaseType> {
    name: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    drawPreviewFunc?: DrawPreviewFunc;
    description?: string;
    channelDefinitions?: ChannelDefinition[];
    channelReceiverDefinitions?: ChannelReceiverDefinition[];
    serializedStateDefinition?: TSerializedStateDef;
}

export class Module<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSerializedStateDef extends JTDBaseType
> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TStateType, TInterfaceType>;
    public settingsFC: ModuleSettings<TStateType, TInterfaceType>;
    protected _importState: ImportState;
    private _moduleInstances: ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef>[];
    private _defaultState: TStateType | null;
    private _settingsToViewInterfaceHydration: InterfaceHydration<TInterfaceType> | null;
    private _stateOptions: StateOptions<TStateType> | undefined;
    private _workbench: Workbench | null;
    private _syncableSettingKeys: SyncSettingKey[];
    private _drawPreviewFunc: DrawPreviewFunc | null;
    private _description: string | null;
    private _channelDefinitions: ChannelDefinition[] | null;
    private _channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
    private _serializedStateDef: TSerializedStateDef | null;
    private _stateSerializer: ModuleStateSerializer<TStateType, JTDDataType<TSerializedStateDef>> | null;
    private _stateDeserializer: ModuleStateDeserializer<TStateType, JTDDataType<TSerializedStateDef>> | null;

    constructor(options: ModuleOptions<TSerializedStateDef>) {
        this._name = options.name;
        this._defaultTitle = options.defaultTitle;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this._importState = ImportState.NotImported;
        this._moduleInstances = [];
        this._defaultState = null;
        this._settingsToViewInterfaceHydration = null;
        this._workbench = null;
        this._syncableSettingKeys = options.syncableSettingKeys ?? [];
        this._drawPreviewFunc = options.drawPreviewFunc ?? null;
        this._description = options.description ?? null;
        this._channelDefinitions = options.channelDefinitions ?? null;
        this._channelReceiverDefinitions = options.channelReceiverDefinitions ?? null;
        this._stateSerializer = null;
        this._stateDeserializer = null;

        if (options.serializedStateDefinition) {
            this._serializedStateDef = options.serializedStateDefinition;
        } else {
            this._serializedStateDef = null;
        }
    }

    registerStateSerializerAndDeserializer(serializerFunc: ModuleStateSerializer<TStateType, JTDDataType<TSerializedStateDef>>, deserializerFunc: ModuleStateDeserializer<TStateType, JTDDataType<TSerializedStateDef>>) {
        this._stateSerializer = serializerFunc;
        this._stateDeserializer = deserializerFunc;

        this._moduleInstances.forEach((instance) => {
            if (this._serializedStateDef && this._stateSerializer && this._stateDeserializer) {
                instance.makeAndInitStatePersistor(this._serializedStateDef, this._stateSerializer, this._stateDeserializer);
            }
        });
    }

    getSerializedStateDef(): TSerializedStateDef | null {
        return this._serializedStateDef;
    }

    getStateSerializer(): ModuleStateSerializer<TStateType, JTDDataType<TSerializedStateDef>> | null {
        return this._stateSerializer;
    }

    getStateDeserializer(): ModuleStateDeserializer<TStateType, JTDDataType<TSerializedStateDef>> | null {
        return this._stateDeserializer;
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

    setDefaultState(defaultState: TStateType, options?: StateOptions<TStateType>): void {
        this._defaultState = defaultState;
        this._stateOptions = options;
        this._moduleInstances.forEach((instance) => {
            this.initModuleInstance(instance);
        });
    }

    setSettingsToViewInterfaceHydration(interfaceHydration: InterfaceHydration<TInterfaceType>): void {
        this._settingsToViewInterfaceHydration = interfaceHydration;
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(instanceNumber: number): ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef>({
            module: this,
            workbench: this._workbench,
            instanceNumber,
            channelDefinitions: this._channelDefinitions,
            channelReceiverDefinitions: this._channelReceiverDefinitions,
        });
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

    private initModuleInstance(instance: ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef>) {
        if (!instance.isInitialised()) {
            if (this._defaultState) {
                instance.setDefaultState(cloneDeep(this._defaultState), cloneDeep(this._stateOptions));
            }
            if (this._settingsToViewInterfaceHydration) {
                instance.makeSettingsToViewInterface(this._settingsToViewInterfaceHydration);
            }
            if (this._serializedStateDef && this._stateSerializer && this._stateDeserializer) {
                instance.makeAndInitStatePersistor(this._serializedStateDef, this._stateSerializer, this._stateDeserializer);
            }
        }
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._defaultState && this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    this.initModuleInstance(instance);
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this._moduleInstances.forEach((instance) => {
                    this.initModuleInstance(instance);
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}
