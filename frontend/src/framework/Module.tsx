import type React from "react";

import type { Getter, Setter } from "jotai";

import type { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import type { InitialSettings } from "./InitialSettings";
import type { SettingsContext, ViewContext } from "./ModuleContext";
import type { ModuleDataTagId } from "./ModuleDataTags";
import { ModuleInstance, ModuleInstanceTopic } from "./ModuleInstance";
import type { DrawPreviewFunc } from "./Preview";
import type { SyncSettingKey } from "./SyncSettings";
import type { InterfaceBaseType, InterfaceInitialization } from "./UniDirectionalModuleComponentsInterface";
import type { Workbench } from "./Workbench";
import type { WorkbenchServices } from "./WorkbenchServices";
import type { WorkbenchSession } from "./WorkbenchSession";
import type { WorkbenchSettings } from "./WorkbenchSettings";

export type OnInstanceUnloadFunc = (instanceId: string) => void;

export enum ModuleCategory {
    MAIN = "main",
    SUB = "sub",
    DEBUG = "debug",
}

export enum ModuleDevState {
    PROD = "prod",
    DEV = "dev",
    DEPRECATED = "deprecated",
}

export type ModuleInterfaceTypes = {
    settingsToView?: InterfaceBaseType;
    viewToSettings?: InterfaceBaseType;
};

export type ModuleInterfacesInitializations<TInterfaceTypes extends ModuleInterfaceTypes> = {
    settingsToView: TInterfaceTypes["settingsToView"] extends undefined
        ? undefined
        : InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>;
    viewToSettings: TInterfaceTypes["viewToSettings"] extends undefined
        ? undefined
        : InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>;
};

export interface UsePersistStateHook<TSerializedStateDefinition> {
    (serializeStateFunction: () => TSerializedStateDefinition, dependencyArray: unknown[]): void;
}

export type ModuleComponentProps<TSerializedStateDefinition extends SerializedStateBaseType[]> = {
    workbenchSession: WorkbenchSession;
    workbenchServices: WorkbenchServices;
    workbenchSettings: WorkbenchSettings;
    initialSettings?: InitialSettings;
    useInitializeState: (serializedState: TSerializedStateDefinition[0]) => void;
    usePersistState: UsePersistStateHook<TSerializedStateDefinition>;
};

export type ModuleSettingsProps<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDefinition extends SerializedStateBaseType[] = UndefinedSerializedStateType,
> = ModuleComponentProps<TSerializedStateDefinition> & {
    settingsContext: SettingsContext<TInterfaceTypes>;
};

export type ModuleViewProps<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
    TSerializedStateDefinition extends SerializedStateBaseType[] = UndefinedSerializedStateType,
> = ModuleComponentProps<TSerializedStateDefinition> & {
    viewContext: ViewContext<TInterfaceTypes>;
};

export type InterfaceEffects<TInterfaceType extends InterfaceBaseType> = ((
    getInterfaceValue: <TKey extends keyof TInterfaceType>(key: TKey) => TInterfaceType[TKey],
    setAtomValue: Setter,
    getAtomValue: Getter,
) => void)[];

export type ModuleSettings<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
> = React.FC<ModuleSettingsProps<TInterfaceTypes>>;

export type ModuleView<
    TInterfaceTypes extends ModuleInterfaceTypes = {
        settingsToView: Record<string, never>;
        viewToSettings: Record<string, never>;
    },
> = React.FC<ModuleViewProps<TInterfaceTypes>>;

export type SerializedStateBaseType = { version: number } & Record<string, unknown>;
export type SerializedStateTuple = [SerializedStateBaseType, ...SerializedStateBaseType[]] | [];
export type UndefinedSerializedStateType = [];

export enum ImportState {
    NotImported = "NotImported",
    Importing = "Importing",
    Imported = "Imported",
    Failed = "Failed",
}

export type ModuleOptions<TSerializedStateDefinition extends SerializedStateTuple> = {
    name: string;
    defaultTitle: string;
    category: ModuleCategory;
    devState: ModuleDevState;
    dataTagIds?: ModuleDataTagId[];
    syncableSettingKeys?: SyncSettingKey[];
    drawPreviewFunc?: DrawPreviewFunc;
    description?: string;
    channelDefinitions?: ChannelDefinition[];
    channelReceiverDefinitions?: ChannelReceiverDefinition[];
    onInstanceUnloadFunc?: OnInstanceUnloadFunc;
} & (TSerializedStateDefinition extends [any] | []
    ? {
          migrateFunctions?: MigrateFunctions<Exclude<TSerializedStateDefinition, []>>;
      }
    : {
          migrateFunctions: MigrateFunctions<Exclude<TSerializedStateDefinition, []>>;
      });
export class Module<
    TInterfaceTypes extends ModuleInterfaceTypes,
    TSerializedStateDefinition extends SerializedStateTuple = UndefinedSerializedStateType,
> {
    private _name: string;
    private _defaultTitle: string;
    public viewFC: ModuleView<TInterfaceTypes>;
    public settingsFC: ModuleSettings<TInterfaceTypes>;
    protected _importState: ImportState = ImportState.NotImported;
    private _moduleInstances: ModuleInstance<TInterfaceTypes>[] = [];
    private _settingsToViewInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["settingsToView"], undefined>
    > | null = null;
    private _viewToSettingsInterfaceInitialization: InterfaceInitialization<
        Exclude<TInterfaceTypes["viewToSettings"], undefined>
    > | null = null;
    private _viewToSettingsInterfaceEffects: InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>> =
        [];
    private _settingsToViewInterfaceEffects: InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>> =
        [];
    private _workbench: Workbench | null = null;
    private _syncableSettingKeys: SyncSettingKey[];
    private _drawPreviewFunc: DrawPreviewFunc | null;
    private _onInstanceUnloadFunc: OnInstanceUnloadFunc | null;
    private _description: string | null;
    private _channelDefinitions: ChannelDefinition[] | null;
    private _channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
    private _category: ModuleCategory;
    private _devState: ModuleDevState;
    private _dataTagIds: ModuleDataTagId[];
    private _serializedStateDefinition: TSerializedStateDefinition | null = null;

    constructor(options: ModuleOptions<TSerializedStateDefinition>) {
        this._name = options.name;
        this._defaultTitle = options.defaultTitle;
        this._category = options.category;
        this._devState = options.devState;
        this.viewFC = () => <div>Not defined</div>;
        this.settingsFC = () => <div>Not defined</div>;
        this._syncableSettingKeys = options.syncableSettingKeys ?? [];
        this._drawPreviewFunc = options.drawPreviewFunc ?? null;
        this._onInstanceUnloadFunc = options.onInstanceUnloadFunc ?? null;
        this._description = options.description ?? null;
        this._channelDefinitions = options.channelDefinitions ?? null;
        this._channelReceiverDefinitions = options.channelReceiverDefinitions ?? null;
        this._dataTagIds = options.dataTagIds ?? [];

        /*
        if (options.serializedStateDefinition) {
            this._serializedStateDefinition = options.serializedStateDefinition;
        }
            */
    }

    getSerializedStateDefinition(): TSerializedStateDefinition | null {
        return this._serializedStateDefinition;
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

    getCategory(): ModuleCategory {
        return this._category;
    }

    getDevState(): ModuleDevState {
        return this._devState;
    }

    getDataTagIds(): ModuleDataTagId[] {
        return this._dataTagIds;
    }

    getDescription(): string | null {
        return this._description;
    }

    setWorkbench(workbench: Workbench): void {
        this._workbench = workbench;
    }

    setSettingsToViewInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["settingsToView"], undefined>>,
    ): void {
        this._settingsToViewInterfaceInitialization = interfaceInitialization;
    }

    setViewToSettingsInterfaceInitialization(
        interfaceInitialization: InterfaceInitialization<Exclude<TInterfaceTypes["viewToSettings"], undefined>>,
    ): void {
        this._viewToSettingsInterfaceInitialization = interfaceInitialization;
    }

    setViewToSettingsInterfaceEffects(
        atomsInitialization: InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>>,
    ): void {
        this._viewToSettingsInterfaceEffects = atomsInitialization;
    }

    setSettingsToViewInterfaceEffects(
        atomsInitialization: InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>>,
    ): void {
        this._settingsToViewInterfaceEffects = atomsInitialization;
    }

    getViewToSettingsInterfaceEffects(): InterfaceEffects<Exclude<TInterfaceTypes["settingsToView"], undefined>> {
        return this._viewToSettingsInterfaceEffects;
    }

    getSettingsToViewInterfaceEffects(): InterfaceEffects<Exclude<TInterfaceTypes["viewToSettings"], undefined>> {
        return this._settingsToViewInterfaceEffects;
    }

    getSyncableSettingKeys(): SyncSettingKey[] {
        return this._syncableSettingKeys;
    }

    hasSyncableSettingKey(key: SyncSettingKey): boolean {
        return this._syncableSettingKeys.includes(key);
    }

    makeInstance(instanceNumber: number): ModuleInstance<TInterfaceTypes> {
        if (!this._workbench) {
            throw new Error("Module must be added to a workbench before making an instance");
        }

        const instance = new ModuleInstance<TInterfaceTypes>({
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

    onInstanceUnload(instanceId: string) {
        this._onInstanceUnloadFunc?.(instanceId);
    }

    private setImportState(state: ImportState): void {
        this._importState = state;
        this._moduleInstances.forEach((instance) => {
            instance.notifySubscribers(ModuleInstanceTopic.IMPORT_STATE);
        });

        if (this._workbench && state === ImportState.Imported) {
            this._workbench.maybeMakeFirstModuleInstanceActive();
        }
    }

    private initializeModuleInstance(instance: ModuleInstance<TInterfaceTypes>): void {
        instance.initialize();
        if (this._settingsToViewInterfaceInitialization) {
            instance.makeSettingsToViewInterface(this._settingsToViewInterfaceInitialization);
        }
        instance.makeSettingsToViewInterfaceEffectsAtom();
        if (this._viewToSettingsInterfaceInitialization) {
            instance.makeViewToSettingsInterface(this._viewToSettingsInterfaceInitialization);
        }
        instance.makeViewToSettingsInterfaceEffectsAtom();
    }

    private maybeImportSelf(): void {
        if (this._importState !== ImportState.NotImported) {
            if (this._importState === ImportState.Imported) {
                this._moduleInstances.forEach((instance) => {
                    if (instance.isInitialized()) {
                        return;
                    }
                    this.initializeModuleInstance(instance);
                });
            }
            return;
        }

        this.setImportState(ImportState.Importing);

        import(`@modules/${this._name}/loadModule.tsx`)
            .then(() => {
                this.setImportState(ImportState.Imported);
                this._moduleInstances.forEach((instance) => {
                    this.initializeModuleInstance(instance);
                });
            })
            .catch((e) => {
                console.error(`Failed to import module ${this._name}`, e);
                this.setImportState(ImportState.Failed);
            });
    }
}

type RemoveLastTupleElement<T extends any[]> = T extends [...infer U, any] ? U : never;
type RemoveFirstTupleElement<T extends any[]> = T extends [any, ...infer U] ? U : never;

// Define a generic type for entity versioning
export type MigrateFunctions<Versions extends [SerializedStateBaseType, ...SerializedStateBaseType[]]> =
    Versions extends [any]
        ? never
        : {
              [K in keyof RemoveLastTupleElement<Versions> as K extends `${infer N extends number}`
                  ? Versions[N]["version"]
                  : never]: (
                  entity: RemoveLastTupleElement<Versions>[K],
              ) => RemoveFirstTupleElement<Versions>[K extends `${infer N extends number}`
                  ? N extends keyof RemoveFirstTupleElement<Versions>
                      ? N
                      : never
                  : never];
          };
