import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceBase } from "./ModuleInstanceBase";
import { StateBaseType, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";
import { CallbackInterfaceBase } from "./SubModule";
import { SubModuleInstance } from "./SubModuleInstance";

export class ModuleContextBase<S extends StateBaseType> {
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

export class ModuleContext<S extends StateBaseType> extends ModuleContextBase<S> {
    protected _moduleInstance: ModuleInstance<S>;

    constructor(moduleInstance: ModuleInstance<S>, stateStore: StateStore<S>) {
        super(stateStore);
        this._moduleInstance = moduleInstance;
    }

    getInstanceIdString(): string {
        return this._moduleInstance.getId();
    }

    getSubModuleInstances(): { subModuleName: string; callback: Function }[] {
        return this._moduleInstance
            .getSubModuleInstances()
            .filter((instance) => instance.getSubModuleInstanceCallbackFunction() !== null)
            .map((instance) => ({
                subModuleName: instance.getName(),
                callback: instance.getSubModuleInstanceCallbackFunction() as Function,
            }));
    }
}

export class SubModuleContext<S extends StateBaseType, I extends CallbackInterfaceBase> extends ModuleContextBase<S> {
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
        return () => {
            this._subModuleInstance.clearSubModuleInstanceCallbackFunction();
        };
    }
}
