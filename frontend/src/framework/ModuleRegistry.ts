import { MainModule } from "./MainModule";
import { StateBaseType, StateOptions } from "./StateStore";
import { CallbackPropertiesBase, SubModule } from "./SubModule";

export class ModuleRegistry {
    private static _registeredModules: Record<string, MainModule<any>> = {};
    private static _registeredSubModules: Record<string, SubModule<any, any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        compatibleSubModules: string[] = []
    ): MainModule<ModuleStateType> {
        const module = new MainModule<ModuleStateType>(moduleName, compatibleSubModules);
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static registerSubModule<
        SubModuleStateType extends StateBaseType,
        CallbackProperties extends CallbackPropertiesBase
    >(subModuleName: string): SubModule<SubModuleStateType, CallbackProperties> {
        const subModule = new SubModule<SubModuleStateType, CallbackProperties>(subModuleName);
        this._registeredSubModules[subModuleName] = subModule;
        return subModule;
    }

    public static initModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): MainModule<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as MainModule<ModuleStateType>;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static initSubModule<
        SubModuleStateType extends StateBaseType,
        CallbackProperties extends CallbackPropertiesBase
    >(
        moduleName: string,
        initialState: SubModuleStateType,
        options?: StateOptions<SubModuleStateType>
    ): SubModule<SubModuleStateType, CallbackProperties> {
        const module = this._registeredSubModules[moduleName];
        if (module) {
            module.setInitialState(initialState);
            return module as SubModule<SubModuleStateType, CallbackProperties>;
        }
        throw "Did you forget to register your sub module in 'src/modules/registerAllModules.ts'?";
    }

    public static getModule(moduleName: string): MainModule<any> | SubModule<any, any> {
        const module = this._registeredModules[moduleName] ?? this._registeredSubModules[moduleName];
        if (module) {
            return module;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static getRegisteredModules(): Record<string, MainModule<any>> {
        return this._registeredModules;
    }

    public static getRegisteredSubModulesForModule(module: MainModule<any>): Record<string, SubModule<any, any>> {
        const subModules: Record<string, SubModule<any, any>> = {};

        for (const moduleName in this._registeredSubModules) {
            if (module.getCompatibleSubModuleNames().includes(moduleName)) {
                subModules[moduleName] = this._registeredSubModules[moduleName];
            }
        }
        return subModules;
    }
}
