import { MainModuleInstance } from "./MainModuleInstance";
import { SubModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType, StateOptions } from "./StateStore";
import { SubModuleFC } from "./SubModule";
import { CallbackPropertiesBase, SubModule } from "./SubModule";

export class SubModuleInstance<
    StateType extends StateBaseType,
    CallbackProperties extends CallbackPropertiesBase
> extends ModuleInstance<StateType> {
    private context: SubModuleContext<StateType, CallbackProperties> | null;
    private parentModuleInstance: MainModuleInstance<any> | null;
    private subModuleInstanceCallbackFunction: ((data: CallbackProperties) => void) | null;
    private module: SubModule<StateType, CallbackProperties>;

    constructor(module: SubModule<StateType, CallbackProperties>, instanceNumber: number, id?: string) {
        super(module, instanceNumber, id);
        this.context = null;
        this.parentModuleInstance = null;
        this.subModuleInstanceCallbackFunction = null;
        this.module = module;
    }

    public setParentModuleInstance(parentModuleInstance: MainModuleInstance<any>): void {
        this.parentModuleInstance = parentModuleInstance;
    }

    public getParentModuleInstance(): MainModuleInstance<any> | null {
        return this.parentModuleInstance;
    }

    public getSubModuleInstanceCallbackFunction(): ((data: CallbackProperties) => void) | null {
        return this.subModuleInstanceCallbackFunction;
    }

    public setSubModuleInstanceCallbackFunction(callbackFunction: (data: CallbackProperties) => void): void {
        this.subModuleInstanceCallbackFunction = callbackFunction;
    }

    public clearSubModuleInstanceCallbackFunction(): void {
        this.subModuleInstanceCallbackFunction = null;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        super.setInitialState(initialState, options);
        if (this.stateStore) {
            this.context = new SubModuleContext<StateType, CallbackProperties>(this, this.stateStore);
        }
    }

    public getContext(): SubModuleContext<StateType, CallbackProperties> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
        return this.context;
    }

    public getViewFC(): SubModuleFC<StateType, CallbackProperties> {
        return this.module.getViewFC();
    }

    public getSettingsFC(): SubModuleFC<StateType, CallbackProperties> {
        return this.module.getSettingsFC();
    }
}
