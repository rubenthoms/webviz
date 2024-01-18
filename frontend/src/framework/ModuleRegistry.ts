import { BroadcastChannelsDef, InputBroadcastChannelDef } from "./Broadcaster";
import { Module } from "./Module";
import { ModuleBusinessLogic } from "./ModuleBusinessLogic";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions<TBusinessLogic extends ModuleBusinessLogic<any, any, any, any> | never> = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    broadcastChannelsDef?: BroadcastChannelsDef;
    inputChannelDefs?: InputBroadcastChannelDef[];
    preview?: DrawPreviewFunc;
    description?: string;
    businessLogicClass?: new (...args: any[]) => TBusinessLogic;
};

export class ModuleNotFoundError extends Error {
    readonly moduleName: string;
    constructor(moduleName: string) {
        super(
            `Module '${moduleName}' not found. Did you forget to register your module in 'src/modules/registerAllModules.ts'?`
        );
        this.moduleName = moduleName;
    }
}

export class ModuleRegistry {
    private static _registeredModules: Record<string, Module<any, any | never>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any, any>> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerModule<ModuleStateType extends StateBaseType>(
        options: RegisterModuleOptions<any>
    ): Module<ModuleStateType, any> {
        const module = new Module<ModuleStateType, any>(
            options.moduleName,
            options.defaultTitle,
            options.syncableSettingKeys,
            options.broadcastChannelsDef,
            options.inputChannelDefs,
            options.preview ?? null,
            options.description ?? null,
            options.businessLogicClass ?? null
        );
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<
        ModuleStateType extends StateBaseType,
        TBusinessLogic extends ModuleBusinessLogic<any, any, any, any> | never = never
    >(
        moduleName: string,
        defaultState: ModuleStateType,
        options?: StateOptions<ModuleStateType>
    ): Module<ModuleStateType, TBusinessLogic> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            return module as Module<ModuleStateType, TBusinessLogic>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any, any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any, any>;
    }

    static getRegisteredModules(): Record<string, Module<any, any>> {
        return this._registeredModules;
    }
}
