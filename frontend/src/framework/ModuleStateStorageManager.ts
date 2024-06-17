import Ajv from "ajv";
import { JTDDataType } from "ajv/dist/core";
import { Atom, PrimitiveAtom, WritableAtom, atom } from "jotai";

import { AtomStore } from "./AtomStoreMaster";
import { JTDBaseType, ModuleStateDeserializer, ModuleStateSerializer } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateStore } from "./StateStore";
import { InterfaceBaseType, UniDirectionalSettingsToViewInterface } from "./UniDirectionalSettingsToViewInterface";
import { PersistableAtomValue } from "./utils/atomUtils";

export class ModuleStateStorageManager<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSerializedStateDef extends JTDBaseType
> {
    private _moduleInstance: ModuleInstance<TStateType, TInterfaceType, any, any, TSerializedStateDef>;
    private _stateStore: StateStore<TStateType>;
    private _atomStore: AtomStore;
    private _settingsViewInterface: UniDirectionalSettingsToViewInterface<TInterfaceType> | null;
    private _serializedStateDefinition: TSerializedStateDef;
    private _stateSerializer: ModuleStateSerializer<TStateType, TInterfaceType, JTDDataType<TSerializedStateDef>>;
    private _stateDeserializer: ModuleStateDeserializer<TStateType, TInterfaceType, JTDDataType<TSerializedStateDef>>;
    private _stateStoreAtom: PrimitiveAtom<TStateType>;
    private _persistanceAtom: Atom<JTDDataType<TSerializedStateDef>>;

    constructor(
        moduleInstance: ModuleInstance<TStateType, TInterfaceType, any, any, TSerializedStateDef>,
        stateStore: StateStore<TStateType>,
        atomStore: AtomStore,
        settingsViewInterface: UniDirectionalSettingsToViewInterface<TInterfaceType> | null,
        serializedStateDefinition: TSerializedStateDef,
        stateSerializer: ModuleStateSerializer<TStateType, TInterfaceType, JTDDataType<TSerializedStateDef>>,
        stateDeserializer: ModuleStateDeserializer<TStateType, TInterfaceType, JTDDataType<TSerializedStateDef>>,
        cachedDefaultState: TStateType
    ) {
        this._moduleInstance = moduleInstance;
        this._serializedStateDefinition = serializedStateDefinition;
        this._stateSerializer = stateSerializer;
        this._stateDeserializer = stateDeserializer;
        this._stateStore = stateStore;
        this._atomStore = atomStore;
        this._settingsViewInterface = settingsViewInterface;

        this._stateStoreAtom = this.makeStateStoreAtomAndConnectToStateStore(cachedDefaultState);

        this._persistanceAtom = atom((get) => {
            const stateStore = get(this._stateStoreAtom);
            const getStateValue = <T extends keyof TStateType>(key: T): TStateType[T] => {
                return stateStore[key];
            };

            /*
            const getAtomValue = <T>(atom: Atom<T | PersistableAtomValue<T>>): T => {
                const value = get(atom);
                if (isPersistableAtomValue(value)) {
                    return value.state;
                }
                return value;
            };
            */

            const getInterfaceValue = <T extends keyof TInterfaceType["baseStates"]>(
                key: T
            ): TInterfaceType["baseStates"][T] => {
                if (this._settingsViewInterface === null) {
                    throw new Error("Settings view interface not available");
                }
                return get(this._settingsViewInterface.getAtom(key));
            };

            return this._stateSerializer(
                getStateValue.bind(stateStore),
                get,
                getInterfaceValue.bind(this._settingsViewInterface)
            );
        });

        atomStore
            .sub(this._persistanceAtom, () => {
                this.persistState();
            })
            .bind(this);
    }

    private makeStateStoreAtomAndConnectToStateStore(cachedDefaultState: TStateType): PrimitiveAtom<TStateType> {
        const stateStoreAtom = atom<TStateType>(cachedDefaultState);
        for (const stateKey of Object.keys(cachedDefaultState)) {
            this._stateStore
                .subscribe(stateKey as keyof TStateType, (value) => {
                    if (this._stateStore && this._stateStoreAtom) {
                        this._atomStore.set(this._stateStoreAtom, {
                            ...this._atomStore.get(this._stateStoreAtom),
                            [stateKey]: value,
                        });
                    }
                })
                .bind(this);
        }
        return stateStoreAtom;
    }

    private fetchAndValidatePersistedState(): JTDDataType<TSerializedStateDef> | null {
        const persistedState = localStorage.getItem(`${this._moduleInstance.getId()}-state`);
        if (persistedState === null) {
            return null;
        }

        const parsedState = JSON.parse(persistedState);
        const ajv = new Ajv({
            // This is a standard keyword of JTD to define arrays, but it is not recognized by AJV - seems to be a bug
            keywords: ["elements"],
        });

        const validate = ajv.compile<TSerializedStateDef>(this._serializedStateDefinition);
        if (!validate(parsedState)) {
            console.error("Persisted state does not match the state definition", validate.errors);
            return null;
        }

        return parsedState as JTDDataType<TSerializedStateDef>;
    }

    maybeApplyPersistedState() {
        const persistedState = this.fetchAndValidatePersistedState();
        if (persistedState === null) {
            return;
        }

        this.applyPersistedState(persistedState);
    }

    persistState() {
        const state = this._atomStore.get(this._persistanceAtom);
        localStorage.setItem(`${this._moduleInstance.getId()}-state`, JSON.stringify(state));
    }

    removePersistedState() {
        localStorage.removeItem(`${this._moduleInstance.getId()}-state`);
    }

    getPersistedState(): JTDDataType<TSerializedStateDef> {
        return this._atomStore.get(this._persistanceAtom);
    }

    applyPersistedState(state: JTDDataType<TSerializedStateDef>) {
        const atomStore = this._atomStore;

        function setAtomStoreValue<T>(
            atom: WritableAtom<PersistableAtomValue<T>, [newValue: T | PersistableAtomValue<T>], void>,
            value: T
        ) {
            const valueWithPersistedFlag: PersistableAtomValue<T> = {
                value: value,
                isPersistedValue: true,
            };
            return atomStore.set(atom, valueWithPersistedFlag);
        }

        const setInterfaceValue = <T extends keyof TInterfaceType["baseStates"]>(
            key: T,
            value: TInterfaceType["baseStates"][T]
        ) => {
            if (this._settingsViewInterface === null) {
                throw new Error("Settings view interface not available");
            }
            const atom = this._settingsViewInterface.getAtom(key);
            return atomStore.set(atom, value);
        };

        this._stateDeserializer(
            state,
            this._stateStore.setValue.bind(this._stateStore),
            setAtomStoreValue,
            setInterfaceValue
        );
    }
}
