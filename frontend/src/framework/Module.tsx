import { ModuleBase, ModuleType } from "./ModuleBase";
import { ModuleContext } from "./ModuleContext";
import { ModuleInstance } from "./ModuleInstance";
import { StateBaseType } from "./StateStore";
import { WorkbenchServices } from "./WorkbenchServices";

export type ModuleFCProps<S extends StateBaseType> = {
    moduleContext: ModuleContext<S>;
    workbenchServices: WorkbenchServices;
};

export type ModuleFC<S extends StateBaseType> = React.FC<ModuleFCProps<S>>;

export class Module<StateType extends StateBaseType> extends ModuleBase<StateType> {
    private compatibleSubModuleNames: string[];
    public viewFC: ModuleFC<StateType>;
    public settingsFC: ModuleFC<StateType>;

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

    public makeInstance(id?: string): ModuleInstance<StateType> {
        const instance = new ModuleInstance<StateType>(this, this.numInstances++, id);
        this.moduleInstances.push(instance);
        this.maybeImportSelf();
        return instance;
    }

    public getViewFC(): ModuleFC<StateType> {
        return this.viewFC;
    }

    public getSettingsFC(): ModuleFC<StateType> {
        return this.settingsFC;
    }
}
