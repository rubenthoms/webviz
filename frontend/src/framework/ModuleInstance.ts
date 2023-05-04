import { Module, ModuleFC } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstanceBase } from "./ModuleInstanceBase";
import { StateBaseType, StateOptions } from "./StateStore";
import { SubModuleInstance } from "./SubModuleInstance";

export class ModuleInstance<StateType extends StateBaseType> extends ModuleInstanceBase<StateType> {
    private context: ModuleContext<StateType> | null;
    private subModuleInstances: SubModuleInstance<any, any>[];
    private module: Module<StateType>;
    private subModuleCallbackCache: Map<string, any>;

    constructor(module: Module<StateType>, instanceNumber: number, id?: string) {
        super(module, instanceNumber, id);
        this.subModuleInstances = [];
        this.context = null;
        this.module = module;
        this.subModuleCallbackCache = new Map<string, any>();
    }

    public addSubModuleInstance(subModuleInstance: SubModuleInstance<any, any>): void {
        this.subModuleInstances.push(subModuleInstance);
    }

    public getSubModuleInstances(): SubModuleInstance<any, any>[] {
        return this.subModuleInstances;
    }

    public cacheSubModuleCallbackFunctionData(subModuleName: string, data: any): void {
        this.subModuleCallbackCache.set(subModuleName, data);
    }

    public getCachedSubModuleCallbackFunctionData(subModuleName: string): any {
        return this.subModuleCallbackCache.get(subModuleName);
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        super.setInitialState(initialState, options);
        if (this.stateStore) {
            this.context = new ModuleContext<StateType>(this, this.stateStore);
        }
    }

    public getContext(): ModuleContext<StateType> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
        return this.context;
    }

    public getViewFC(): ModuleFC<StateType> {
        return this.module.getViewFC();
    }

    public getSettingsFC(): ModuleFC<StateType> {
        return this.module.getSettingsFC();
    }
}
