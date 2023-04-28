import { ModuleBase, ModuleType } from "./ModuleBase";
import { SubModuleContext } from "./ModuleContext";
import { StateBaseType } from "./StateStore";
import { SubModuleInstance } from "./SubModuleInstance";
import { WorkbenchServices } from "./WorkbenchServices";

export type CallbackInterfaceBase = {
    [key: string]: any;
};

export type SubModuleFCProps<S extends StateBaseType, CallbackInterface extends CallbackInterfaceBase> = {
    moduleContext: SubModuleContext<S, CallbackInterface>;
    workbenchServices: WorkbenchServices;
};

export type SubModuleFC<S extends StateBaseType, CallbackInterface extends CallbackInterfaceBase> = React.FC<
    SubModuleFCProps<S, CallbackInterface>
>;

export class SubModule<
    StateType extends StateBaseType,
    CallbackInterface extends CallbackInterfaceBase
> extends ModuleBase<StateType> {
    public viewFC: SubModuleFC<StateType, CallbackInterface>;
    public settingsFC: SubModuleFC<StateType, CallbackInterface>;

    constructor(name: string) {
        super(name);
        this.viewFC = () => <div>Not implemented</div>;
        this.settingsFC = () => null;
    }

    public getType(): ModuleType {
        return ModuleType.SubModule;
    }

    public makeInstance(id?: string): SubModuleInstance<StateType, CallbackInterface> | SubModuleInstance<any, any> {
        const instance = new SubModuleInstance<StateType, CallbackInterface>(this, this.numInstances++, id);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    public getViewFC(): SubModuleFC<StateType, CallbackInterface> {
        return this.viewFC;
    }

    public getSettingsFC(): SubModuleFC<StateType, CallbackInterface> {
        return this.settingsFC;
    }
}
