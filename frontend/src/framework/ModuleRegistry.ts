import { JTDDataType } from "ajv/dist/core";

import { ChannelDefinition, ChannelReceiverDefinition } from "./DataChannelTypes";
import { JTDBaseType, MakeReadonly, Module, ModuleStateDeserializer, ModuleStateSerializer } from "./Module";
import { DrawPreviewFunc } from "./Preview";
import { StateBaseType, StateOptions } from "./StateStore";
import { SyncSettingKey } from "./SyncSettings";
import { InterfaceBaseType, InterfaceHydration } from "./UniDirectionalSettingsToViewInterface";
import { ModuleNotFoundPlaceholder } from "./internal/ModuleNotFoundPlaceholder";

export type RegisterModuleOptions<TState extends StateBaseType, TSerializedStateDef extends JTDBaseType> = {
    moduleName: string;
    defaultTitle: string;
    syncableSettingKeys?: SyncSettingKey[];
    channelDefinitions?: ChannelDefinition[];
    channelReceiverDefinitions?: ChannelReceiverDefinition[];
    preview?: DrawPreviewFunc;
    description?: string;
    serialization?: {
        serializedStateDefinition: MakeReadonly<TSerializedStateDef>;
        stateSerializer: ModuleStateSerializer<TState, JTDDataType<TSerializedStateDef>>;
        stateDeserializer: ModuleStateDeserializer<TState, JTDDataType<TSerializedStateDef>>;
    };
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
    private static _registeredModules: Record<string, Module<any, any, any>> = {};
    private static _moduleNotFoundPlaceholders: Record<string, Module<any, any, any>> = {};

    /* eslint-disable-next-line @typescript-eslint/no-empty-function */
    private constructor() {}

    static registerModule<
        TStateType extends StateBaseType,
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        },
        TSerializedStateDef extends JTDBaseType = Record<string, never>
    >(
        options: RegisterModuleOptions<TStateType, TSerializedStateDef>
    ): Module<TStateType, TInterfaceType, TSerializedStateDef> {
        const module = new Module<TStateType, TInterfaceType, TSerializedStateDef>({
            name: options.moduleName,
            defaultTitle: options.defaultTitle,
            syncableSettingKeys: options.syncableSettingKeys ?? [],
            channelDefinitions: options.channelDefinitions,
            channelReceiverDefinitions: options.channelReceiverDefinitions,
            drawPreviewFunc: options.preview,
            description: options.description,
            serialization: options.serialization,
        });
        this._registeredModules[options.moduleName] = module;
        return module;
    }

    static initModule<
        TStateType extends StateBaseType,
        TInterfaceType extends InterfaceBaseType = {
            baseStates: Record<string, never>;
            derivedStates: Record<string, never>;
        }
    >(
        moduleName: string,
        defaultState: TStateType,
        options?: StateOptions<TStateType>,
        interfaceHydration?: InterfaceHydration<TInterfaceType>
    ): Module<TStateType, TInterfaceType, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            module.setDefaultState(defaultState, options);
            if (interfaceHydration) {
                module.setSettingsToViewInterfaceHydration(interfaceHydration);
            }
            return module as Module<TStateType, TInterfaceType, any>;
        }
        throw new ModuleNotFoundError(moduleName);
    }

    static getModule(moduleName: string): Module<any, any, any> {
        const module = this._registeredModules[moduleName];
        if (module) {
            return module as Module<any, any, any>;
        }
        const placeholder = this._moduleNotFoundPlaceholders[moduleName];
        if (placeholder) {
            return placeholder as Module<any, any, any>;
        }
        this._moduleNotFoundPlaceholders[moduleName] = new ModuleNotFoundPlaceholder(moduleName);
        return this._moduleNotFoundPlaceholders[moduleName] as Module<any, any, any>;
    }

    static getRegisteredModules(): Record<string, Module<any, any, any>> {
        return this._registeredModules;
    }
}
