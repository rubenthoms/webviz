import { Module } from "./Module";
import { ModuleBase } from "./ModuleBase";
import { StateBaseType, StateOptions } from "./StateStore";
import { SubModule } from "./SubModule";

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any>> = {};
    private static _registeredSubModules: Record<string, SubModule<any>> = {};
    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    public static registerModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        compatibleSubModules: string[] = []
    ): Module<ModuleStateType> {
        const module = new Module<ModuleStateType>(moduleName, compatibleSubModules);
        this._registeredModules[moduleName] = module;
        return module;
    }

    public static registerSubModule(subModuleName: string): SubModule<Record<string, never>> {
        const subModule = new SubModule<Record<string, never>>(subModuleName);
        this._registeredSubModules[subModuleName] = subModule;
        return subModule;
    }

    public static initModule<ModuleStateType extends StateBaseType>(
        moduleName: string,
        initialState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setInitialState(initialState, options);
            return module as Module<ModuleStateType>;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static initSubModule(moduleName: string): SubModule<Record<string, never>> {
        const module = this._registeredSubModules[moduleName];
        if (module) {
            return module as SubModule<Record<string, never>>;
        }
        throw "Did you forget to register your sub module in 'src/modules/registerAllModules.ts'?";
    }

    public static getModule(moduleName: string): ModuleBase<any> {
        const module = this._registeredModules[moduleName] ?? this._registeredSubModules[moduleName];
        if (module) {
            return module;
        }
        throw "Did you forget to register your module in 'src/modules/registerAllModules.ts'?";
    }

    public static getRegisteredModules(): Record<string, Module<any>> {
        return this._registeredModules;
    }

    public static getRegisteredSubModulesForModule(module: Module<any>): Record<string, SubModule<any>> {
        const subModules: Record<string, SubModule<any>> = {};

        for (const moduleName in this._registeredSubModules) {
            if (module.getCompatibleSubModuleNames().includes(moduleName)) {
                subModules[moduleName] = this._registeredSubModules[moduleName];
            }
        }
        return subModules;
    }
}
