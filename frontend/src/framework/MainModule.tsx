import { MainModuleInstance } from "./MainModuleInstance";
import { Module, ModuleType } from "./Module";
import { MainModuleContext } from "./ModuleContext";
import { StateBaseType } from "./StateStore";
import { WorkbenchServices } from "./WorkbenchServices";

export type MainModuleFCProps<S extends StateBaseType> = {
    moduleContext: MainModuleContext<S>;
    workbenchServices: WorkbenchServices;
};

export type MainModuleFC<S extends StateBaseType> = React.FC<MainModuleFCProps<S>>;

export class MainModule<StateType extends StateBaseType> extends Module<StateType> {
    private compatibleSubModuleNames: string[];
    public viewFC: MainModuleFC<StateType>;
    public settingsFC: MainModuleFC<StateType>;

    constructor(name: string, compatibleSubModuleNames: string[] = []) {
        super(name);
        this.compatibleSubModuleNames = compatibleSubModuleNames;
        this.viewFC = () => <div>Not implemented</div>;
        this.settingsFC = () => null;
    }

    public getType(): ModuleType {
        return ModuleType.MainModule;
    }

    public getCompatibleSubModuleNames(): string[] {
        return this.compatibleSubModuleNames;
    }

    public makeInstance(id?: string): MainModuleInstance<StateType> {
        const instance = new MainModuleInstance<StateType>(this, this.numInstances++, id);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    public getViewFC(): MainModuleFC<StateType> {
        return this.viewFC;
    }

    public getSettingsFC(): MainModuleFC<StateType> {
        return this.settingsFC;
    }
}
