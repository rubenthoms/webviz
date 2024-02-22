import { Atom, PrimitiveAtom, atom } from "jotai";
import { JTDBaseType, ModuleStateDeserializer, ModuleStateSerializer } from "./Module";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateStore } from "./StateStore";
import { InterfaceBaseType } from "./UniDirectionalSettingsToViewInterface";
import { JTDDataType } from "ajv/dist/core";
import Ajv from "ajv";
import { AtomStore } from "./AtomStoreMaster";

export class ModuleStatePersistor<
    TStateType extends StateBaseType,
    TInterfaceType extends InterfaceBaseType,
    TSerializedStateDef extends JTDBaseType
> {
    private _moduleInstance: ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef>;
    private _stateStore: StateStore<TStateType>;
    private _atomStore: AtomStore;
    private _serializedStateDefinition: TSerializedStateDef;
    private _stateSerializer: ModuleStateSerializer<TStateType, JTDDataType<TSerializedStateDef>>;
    private _stateDeserializer: ModuleStateDeserializer<TStateType, JTDDataType<TSerializedStateDef>>;
    private _stateStoreAtom: PrimitiveAtom<TStateType>;
    private _persistanceAtom: Atom<JTDDataType<TSerializedStateDef>>;

    constructor(moduleInstance: ModuleInstance<TStateType, TInterfaceType, TSerializedStateDef>, stateStore: StateStore<TStateType>, atomStore: AtomStore, serializedStateDefinition: TSerializedStateDef, stateSerializer: ModuleStateSerializer<TStateType, JTDDataType<TSerializedStateDef>>, stateDeserializer: ModuleStateDeserializer<TStateType, JTDDataType<TSerializedStateDef>>, cachedDefaultState: TStateType) {
        this._moduleInstance = moduleInstance;
        this._serializedStateDefinition = serializedStateDefinition;
        this._stateSerializer = stateSerializer;
        this._stateDeserializer = stateDeserializer;
        this._stateStore = stateStore;
        this._atomStore = atomStore;

        this._stateStoreAtom = this.makeStateStoreAtomAndConnectToStateStore(cachedDefaultState);

        this._persistanceAtom = atom((get) => {
            const stateStore = get(this._stateStoreAtom);
            const getStateValue = <T extends keyof TStateType>(key: T): TStateType[T] => {
                return stateStore[key];
            };
            return this._stateSerializer(getStateValue.bind(stateStore), get);
        });

        atomStore.sub(this._persistanceAtom, () => {
            this.persistState();
        }).bind(this);
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
        const ajv = new Ajv();

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

        this._stateDeserializer(persistedState, this._stateStore.setValue.bind(this._stateStore), this._atomStore.set.bind(this._atomStore));
    }

    persistState() {
        const state = this._atomStore.get(this._persistanceAtom);
        localStorage.setItem(`${this._moduleInstance.getId()}-state`, JSON.stringify(state));
    }

    removePersistedState() {
        localStorage.removeItem(`${this._moduleInstance.getId()}-state`);
    }
}