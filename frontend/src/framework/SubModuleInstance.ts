import { SubModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { ModuleInstanceBase } from "./ModuleInstanceBase";
import { StateBaseType, StateOptions } from "./StateStore";
import { SubModuleFC } from "./SubModule";
import { CallbackInterfaceBase, SubModule } from "./SubModule";

export class SubModuleInstance<
    StateType extends StateBaseType,
    CallbackInterface extends CallbackInterfaceBase
> extends ModuleInstanceBase<StateType> {
    private context: SubModuleContext<StateType, CallbackInterface> | null;
    private parentModuleInstance: ModuleInstance<any> | null;
    private subModuleInstanceCallbackFunction: ((data: CallbackInterface) => void) | null;
    private module: SubModule<StateType, CallbackInterface>;

    constructor(module: SubModule<StateType, CallbackInterface>, instanceNumber: number, id?: string) {
        super(module, instanceNumber, id);
        this.context = null;
        this.parentModuleInstance = null;
        this.subModuleInstanceCallbackFunction = null;
        this.module = module;
    }

    public setParentModuleInstance(parentModuleInstance: ModuleInstance<any>): void {
        this.parentModuleInstance = parentModuleInstance;
    }

    public getParentModuleInstance(): ModuleInstanceBase<any> | null {
        return this.parentModuleInstance;
    }

    public getSubModuleInstanceCallbackFunction(): ((data: CallbackInterface) => void) | null {
        return this.subModuleInstanceCallbackFunction;
    }

    public setSubModuleInstanceCallbackFunction(callbackFunction: (data: CallbackInterface) => void): void {
        this.subModuleInstanceCallbackFunction = callbackFunction;
    }

    public clearSubModuleInstanceCallbackFunction(): void {
        this.subModuleInstanceCallbackFunction = null;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        super.setInitialState(initialState, options);
        if (this.stateStore) {
            this.context = new SubModuleContext<StateType, CallbackInterface>(this, this.stateStore);
        }
    }

    public getContext(): SubModuleContext<StateType, CallbackInterface> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
        return this.context;
    }

    public getViewFC(): SubModuleFC<StateType, CallbackInterface> {
        return this.module.getViewFC();
    }

    public getSettingsFC(): SubModuleFC<StateType, CallbackInterface> {
        return this.module.getSettingsFC();
    }
}
