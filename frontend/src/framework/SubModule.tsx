import { Module, ModuleType } from "./Module";
import { SubModuleContext } from "./ModuleContext";
import { StateBaseType } from "./StateStore";
import { SubModuleInstance } from "./SubModuleInstance";
import { WorkbenchServices } from "./WorkbenchServices";

export type CallbackPropertiesBase = {
    [key: string]: any;
};

export type SubModuleFCProps<S extends StateBaseType, CallbackProperties extends CallbackPropertiesBase> = {
    moduleContext: SubModuleContext<S, CallbackProperties>;
    workbenchServices: WorkbenchServices;
};

export type SubModuleFC<S extends StateBaseType, CallbackProperties extends CallbackPropertiesBase> = React.FC<
    SubModuleFCProps<S, CallbackProperties>
>;

export class SubModule<
    StateType extends StateBaseType,
    CallbackProperties extends CallbackPropertiesBase
> extends Module<StateType> {
    public viewFC: SubModuleFC<StateType, CallbackProperties>;
    public settingsFC: SubModuleFC<StateType, CallbackProperties>;

    constructor(name: string) {
        super(name);
        this.viewFC = () => <div>Not implemented</div>;
        this.settingsFC = () => null;
    }

    public getType(): ModuleType {
        return ModuleType.SubModule;
    }

    public makeInstance(id?: string): SubModuleInstance<StateType, CallbackProperties> | SubModuleInstance<any, any> {
        const instance = new SubModuleInstance<StateType, CallbackProperties>(this, this.numInstances++, id);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    public getViewFC(): SubModuleFC<StateType, CallbackProperties> {
        return this.viewFC;
    }

    public getSettingsFC(): SubModuleFC<StateType, CallbackProperties> {
        return this.settingsFC;
    }
}
