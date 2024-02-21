import { ErrorInfo } from "react";

import Ajv from "ajv";
import { JTDDataType } from "ajv/dist/core";
import { Atom, PrimitiveAtom, WritableAtom, atom } from "jotai";
import { cloneDeep } from "lodash";

import { AtomStore } from "./AtomStoreMaster";
import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { InitialSettings } from "./InitialSettings";
import { ImportState, JTDBaseType, Module, ModuleSettings, ModuleView } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import {
    InterfaceBaseType,
    InterfaceHydration,
    UniDirectionalSettingsToViewInterface,
} from "./UniDirectionalSettingsToViewInterface";
import { Workbench } from "./Workbench";
import { ChannelManager } from "./internal/DataChannels/ChannelManager";
import { ModuleInstanceStatusControllerInternal } from "./internal/ModuleInstanceStatusControllerInternal";

export enum ModuleInstanceState {
    INITIALIZING,
    OK,
    ERROR,
    RESETTING,
}

export interface ModuleInstanceOptions<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSerializedStateDef extends JTDBaseType
> {
    module: Module<TStateType, TInterfaceType, TSerializedStateDef>;
    workbench: Workbench;
    instanceNumber: number;
    channelDefinitions: ChannelDefinition[] | null;
    channelReceiverDefinitions: ChannelReceiverDefinition[] | null;
}

export class ModuleInstance<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSerializedStateDef extends JTDBaseType
> {
    private _id: string;
    private _title: string;
    private _initialised: boolean;
    private _moduleInstanceState: ModuleInstanceState;
    private _fatalError: { err: Error; errInfo: ErrorInfo } | null;
    private _syncedSettingKeys: SyncSettingKey[];
    private _stateStore: StateStore<TStateType> | null;
    private _module: Module<TStateType, TInterfaceType, TSerializedStateDef>;
    private _context: ModuleContext<TStateType, TInterfaceType, TSerializedStateDef> | null;
    private _importStateSubscribers: Set<() => void>;
    private _moduleInstanceStateSubscribers: Set<(moduleInstanceState: ModuleInstanceState) => void>;
    private _syncedSettingsSubscribers: Set<(syncedSettings: SyncSettingKey[]) => void>;
    private _titleChangeSubscribers: Set<(title: string) => void>;
    private _cachedDefaultState: TStateType | null;
    private _cachedStateStoreOptions?: StateOptions<TStateType>;
    private _initialSettings: InitialSettings | null;
    private _statusController: ModuleInstanceStatusControllerInternal;
    private _channelManager: ChannelManager;
    private _workbench: Workbench;
    private _settingsViewInterface: UniDirectionalSettingsToViewInterface<TInterfaceType> | null;
    private _stateStoreAtom: PrimitiveAtom<TStateType> | null;
    private _persistanceAtom: Atom<JTDDataType<TSerializedStateDef>> | null;

    constructor(options: ModuleInstanceOptions<TStateType, TInterfaceType, TSerializedStateDef>) {
        this._id = `${options.module.getName()}-${options.instanceNumber}`;
        this._title = options.module.getDefaultTitle();
        this._stateStore = null;
        this._stateStoreAtom = null;
        this._module = options.module;
        this._importStateSubscribers = new Set();
        this._context = null;
        this._initialised = false;
        this._syncedSettingKeys = [];
        this._syncedSettingsSubscribers = new Set();
        this._moduleInstanceStateSubscribers = new Set();
        this._titleChangeSubscribers = new Set();
        this._moduleInstanceState = ModuleInstanceState.INITIALIZING;
        this._fatalError = null;
        this._cachedDefaultState = null;
        this._initialSettings = null;
        this._statusController = new ModuleInstanceStatusControllerInternal();
        this._workbench = options.workbench;
        this._settingsViewInterface = null;
        this._persistanceAtom = null;

        this._channelManager = new ChannelManager(this._id);

        if (options.channelReceiverDefinitions) {
            this._channelManager.registerReceivers(
                options.channelReceiverDefinitions.map((el) => ({
                    ...el,
                    supportsMultiContents: el.supportsMultiContents ?? false,
                }))
            );
        }

        if (options.channelDefinitions) {
            this._channelManager.registerChannels(options.channelDefinitions);
        }
    }

    getAtomStore(): AtomStore {
        return this._workbench.getAtomStoreMaster().getAtomStoreForModuleInstance(this._id);
    }

    getUniDirectionalSettingsToViewInterface(): UniDirectionalSettingsToViewInterface<TInterfaceType> {
        if (!this._settingsViewInterface) {
            throw `Module instance '${this._title}' does not have an interface yet. Did you forget to init the module?`;
        }
        return this._settingsViewInterface;
    }

    getChannelManager(): ChannelManager {
        return this._channelManager;
    }

    setDefaultState(defaultState: TStateType, options?: StateOptions<TStateType>): void {
        if (this._cachedDefaultState === null) {
            this._cachedDefaultState = defaultState;
            this._cachedStateStoreOptions = options;
        }

        this._stateStore = new StateStore<TStateType>(cloneDeep(defaultState), options);
        this._context = new ModuleContext<TStateType, TInterfaceType, TSerializedStateDef>(this, this._stateStore);

        this._initialised = true;
        this.setModuleInstanceState(ModuleInstanceState.OK);
    }

    maybeApplyPersistedState() {
        const serializedStateDefinition = this._module.getSerializedStateDef();
        const deserializerFunc = this._module.getStateDeserializer();
        const persistedState = localStorage.getItem(`${this._id}-state`);

        if (serializedStateDefinition && deserializerFunc && persistedState && this._stateStore) {
            const parsedPersistedState = JSON.parse(persistedState);
            const ajv = new Ajv();
            const validate = ajv.compile<TSerializedStateDef>(serializedStateDefinition);
            if (!validate(parsedPersistedState)) {
                console.error("Persisted state does not match the state definition", validate.errors);
                return;
            }
            const stateStore = this._stateStore;
            const atomStore = this.getAtomStore();
            deserializerFunc(
                parsedPersistedState as JTDDataType<TSerializedStateDef>,
                stateStore.setValue.bind(stateStore),
                atomStore.set.bind(atomStore)
            );
        }
    }

    persistState() {
        const serializedStateDefinition = this._module.getSerializedStateDef();
        const serializerFunc = this._module.getStateSerializer();
        const stateStore = this._stateStore;
        const atomStore = this.getAtomStore();
        if (stateStore && serializedStateDefinition && serializerFunc && this._stateStore && this._persistanceAtom) {
            atomStore.sub(this._persistanceAtom, () => {
                const serializedState = serializerFunc(
                    stateStore.getValue.bind(stateStore),
                    atomStore.get.bind(atomStore)
                );
                localStorage.setItem(`${this._id}-state`, JSON.stringify(serializedState));
            });
        }
    }

    persistStateOnStateStoreChange() {
        const atomStore = this.getAtomStore();
        const serializerFunc = this._module.getStateSerializer();
        if (this._stateStore && this._cachedDefaultState && serializerFunc) {
            this._stateStoreAtom = atom<TStateType>(this._cachedDefaultState);
            for (const stateKey of Object.keys(this._cachedDefaultState)) {
                this._stateStore
                    .subscribe(stateKey as keyof TStateType, (value) => {
                        if (this._stateStore && this._stateStoreAtom) {
                            atomStore.set(this._stateStoreAtom, {
                                ...atomStore.get(this._stateStoreAtom),
                                stateKey: value,
                            });
                        }
                    })
                    .bind(this);
            }
            this._persistanceAtom = atom((get) => {
                const serializerFunc = this._module.getStateSerializer();
                if (this._stateStoreAtom && serializerFunc) {
                    const stateStore = get(this._stateStoreAtom);
                    const getStateValue = <T extends keyof TStateType>(key: T): TStateType[T] => {
                        return stateStore[key];
                    };
                    return serializerFunc(getStateValue.bind(stateStore), get);
                }
                throw new Error("State store or serializer function is not available");
            });

            atomStore
                .sub(this._persistanceAtom, () => {
                    if (this._stateStore) {
                        const serializedState = serializerFunc(
                            this._stateStore.getValue.bind(this._stateStore),
                            atomStore.get.bind(atomStore)
                        );
                        localStorage.setItem(`${this._id}-state`, JSON.stringify(serializedState));
                    }
                })
                .bind(this);
        }
    }

    makeSettingsToViewInterface(interfaceHydration: InterfaceHydration<TInterfaceType>) {
        this._settingsViewInterface = new UniDirectionalSettingsToViewInterface(interfaceHydration);
        this.maybeApplyPersistedState();
    }

    addSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys.push(settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    getSyncedSettingKeys(): SyncSettingKey[] {
        return this._syncedSettingKeys;
    }

    isSyncedSetting(settingKey: SyncSettingKey): boolean {
        return this._syncedSettingKeys.includes(settingKey);
    }

    removeSyncedSetting(settingKey: SyncSettingKey): void {
        this._syncedSettingKeys = this._syncedSettingKeys.filter((a) => a !== settingKey);
        this.notifySubscribersAboutSyncedSettingKeysChange();
    }

    subscribeToSyncedSettingKeysChange(cb: (syncedSettings: SyncSettingKey[]) => void): () => void {
        this._syncedSettingsSubscribers.add(cb);

        // Trigger callback immediately with our current set of keys
        cb(this._syncedSettingKeys);

        return () => {
            this._syncedSettingsSubscribers.delete(cb);
        };
    }

    isInitialised(): boolean {
        return this._initialised;
    }

    getViewFC(): ModuleView<TStateType, TInterfaceType> {
        return this._module.viewFC;
    }

    getSettingsFC(): ModuleSettings<TStateType, TInterfaceType> {
        return this._module.settingsFC;
    }

    getImportState(): ImportState {
        return this._module.getImportState();
    }

    getContext(): ModuleContext<TStateType, TInterfaceType, TSerializedStateDef> {
        if (!this._context) {
            throw `Module context is not available yet. Did you forget to init the module '${this._title}.'?`;
        }
        return this._context;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._module.getName();
    }

    getTitle(): string {
        return this._title;
    }

    setTitle(title: string): void {
        this._title = title;
        this.notifySubscribersAboutTitleChange();
    }

    subscribeToTitleChange(cb: (title: string) => void): () => void {
        this._titleChangeSubscribers.add(cb);
        return () => {
            this._titleChangeSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutTitleChange(): void {
        this._titleChangeSubscribers.forEach((subscriber) => {
            subscriber(this._title);
        });
    }

    getModule(): Module<TStateType, TInterfaceType, TSerializedStateDef> {
        return this._module;
    }

    getStatusController(): ModuleInstanceStatusControllerInternal {
        return this._statusController;
    }

    subscribeToImportStateChange(cb: () => void): () => void {
        this._importStateSubscribers.add(cb);
        return () => {
            this._importStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutImportStateChange(): void {
        this._importStateSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }

    notifySubscribersAboutSyncedSettingKeysChange(): void {
        this._syncedSettingsSubscribers.forEach((subscriber) => {
            subscriber(this._syncedSettingKeys);
        });
    }

    subscribeToModuleInstanceStateChange(cb: () => void): () => void {
        this._moduleInstanceStateSubscribers.add(cb);
        return () => {
            this._moduleInstanceStateSubscribers.delete(cb);
        };
    }

    notifySubscribersAboutModuleInstanceStateChange(): void {
        this._moduleInstanceStateSubscribers.forEach((subscriber) => {
            subscriber(this._moduleInstanceState);
        });
    }

    private setModuleInstanceState(moduleInstanceState: ModuleInstanceState): void {
        this._moduleInstanceState = moduleInstanceState;
        this.notifySubscribersAboutModuleInstanceStateChange();
    }

    getModuleInstanceState(): ModuleInstanceState {
        return this._moduleInstanceState;
    }

    setFatalError(err: Error, errInfo: ErrorInfo): void {
        this.setModuleInstanceState(ModuleInstanceState.ERROR);
        this._fatalError = {
            err,
            errInfo,
        };
    }

    getFatalError(): {
        err: Error;
        errInfo: ErrorInfo;
    } | null {
        return this._fatalError;
    }

    reset(): Promise<void> {
        this.setModuleInstanceState(ModuleInstanceState.RESETTING);

        return new Promise((resolve) => {
            this.setDefaultState(this._cachedDefaultState as TStateType, this._cachedStateStoreOptions);
            resolve();
        });
    }

    setInitialSettings(initialSettings: InitialSettings): void {
        this._initialSettings = initialSettings;
    }

    getInitialSettings(): InitialSettings | null {
        return this._initialSettings;
    }
}
