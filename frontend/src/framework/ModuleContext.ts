import { MainModuleInstance } from "./MainModuleInstance";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { CallbackPropertiesBase } from "./SubModule";
import { SubModuleInstance } from "./SubModuleInstance";

export class ModuleContext<S extends StateBaseType> {
    private _stateStore: StateStore<S>;

    constructor(stateStore: StateStore<S>) {
        this._stateStore = stateStore;
    }

    getInstanceIdString(): string {
        throw "Not implemented";
    }

    getStateStore(): StateStore<S> {
        return this._stateStore;
    }

    useStoreState<K extends keyof S>(key: K): [S[K], (value: S[K] | ((prev: S[K]) => S[K])) => void] {
        return useStoreState(this._stateStore, key);
    }

    useStoreValue<K extends keyof S>(key: K): S[K] {
        return useStoreValue(this._stateStore, key);
    }

    useSetStoreValue<K extends keyof S>(key: K): (newValue: S[K] | ((prev: S[K]) => S[K])) => void {
        return useSetStoreValue(this._stateStore, key);
    }
}

export class MainModuleContext<S extends StateBaseType> extends ModuleContext<S> {
    protected _moduleInstance: MainModuleInstance<S>;

    constructor(moduleInstance: MainModuleInstance<S>, stateStore: StateStore<S>) {
        super(stateStore);
        this._moduleInstance = moduleInstance;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    getSubModuleInstances(): { subModuleName: string; callback: (data: CallbackPropertiesBase) => void }[] {
        return this._moduleInstance
            .getSubModuleInstances()
            .filter((instance) => instance.getSubModuleInstanceCallbackFunction() !== null)
            .map((instance) => ({
                subModuleName: instance.getName(),
                callback: (data: CallbackPropertiesBase) => {
                    this._moduleInstance.cacheSubModuleCallbackFunctionData(instance.getName(), data);
                    const cb = instance.getSubModuleInstanceCallbackFunction();
                    if (cb) {
                        cb(data);
                    }
                },
            }));
    }
}

export class SubModuleContext<S extends StateBaseType, I extends CallbackPropertiesBase> extends ModuleContext<S> {
    protected _subModuleInstance: SubModuleInstance<S, I>;

    constructor(subModuleInstance: SubModuleInstance<S, I>, stateStore: StateStore<S>) {
        super(stateStore);
        this._subModuleInstance = subModuleInstance;
    }

    getInstanceIdString(): string {
        return this._subModuleInstance.getId();
    }

    registerSubModuleCallbackFunction(callback: (data: I) => void): () => void {
        this._subModuleInstance.setSubModuleInstanceCallbackFunction(callback);

        const parent = this._subModuleInstance.getParentModuleInstance();
        if (parent) {
            const data = parent.getCachedSubModuleCallbackFunctionData(this._subModuleInstance.getName());
            if (data) {
                callback(data);
            }
        }

        return () => {
            this._subModuleInstance.clearSubModuleInstanceCallbackFunction();
        };
    }
}
