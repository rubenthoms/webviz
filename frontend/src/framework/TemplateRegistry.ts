import { v4 } from "uuid";

import type { ModuleSerializedStateMap } from "@modules/ModuleSerializedStateMap";

import type { ElevatedSettingDefinition } from "./ElevatedSettings/ElevatedSettingDefinition";
import type { AddElevatedSettingOptions } from "./ElevatedSettings/ElevatedSettingsService";
import type { LayoutElement } from "./internal/Dashboard";
import type { SyncSettingKey } from "./SyncSettings";
import type { KeyKind } from "./types/dataChannnel";

export type DataChannelTemplate = {
    listensToInstanceRef: string;
    kindOfKey: KeyKind;
    channelIdString: string;
};

export type TemplateLayoutElement = Omit<LayoutElement, "moduleInstanceId" | "moduleName">;

export type TemplateModuleInstance<M extends keyof ModuleSerializedStateMap = keyof ModuleSerializedStateMap> = {
    id: string;
    instanceRef?: string;
    moduleName: M;
    layout: TemplateLayoutElement;
    syncedSettings?: SyncSettingKey[];
    dataChannelsToInitialSettingsMapping?: Record<string, DataChannelTemplate>;
    initialState?: {
        settings?: ModuleSerializedStateMap[M]["settings"];
        view?: ModuleSerializedStateMap[M]["view"];
    };
};

export type TemplateElevatedSetting = {
    definition: ElevatedSettingDefinition<any, any>;
    options: AddElevatedSettingOptions<any, any>;
};

export type Template = {
    name: string;
    description: string;
    moduleInstances: TemplateModuleInstance[];
    // Elevated on the dashboard before its module instances are created. A given `value` is treated
    // like a restored one: kept (and flagged) if it doesn't fit the context, instead of being fixed up.
    elevatedSettings?: TemplateElevatedSetting[];
};

// Type-checks the value/constraint override against the elevated setting's own types.
export function createTemplateElevatedSetting<TValue, TConstraints>(
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
    options: AddElevatedSettingOptions<TValue, TConstraints> = {},
): TemplateElevatedSetting {
    return { definition, options };
}

export function createTemplateModuleInstance<M extends keyof ModuleSerializedStateMap = keyof ModuleSerializedStateMap>(
    moduleName: M,
    options: Omit<TemplateModuleInstance<M>, "moduleName" | "id">,
): TemplateModuleInstance<M> {
    return {
        moduleName,
        id: v4(),
        ...options,
    };
}

export class TemplateRegistry {
    private static _registeredTemplates: Template[] = [];

    private constructor() {}

    static registerTemplate(template: Template): void {
        if (this._registeredTemplates.find((t) => t.name === template.name)) {
            throw new Error(`Template with name ${template.name} already registered.`);
        }
        this._registeredTemplates.push(template);
    }

    static getRegisteredTemplates(): Template[] {
        return this._registeredTemplates;
    }

    static getTemplate(name: string): Template {
        const template = this._registeredTemplates.find((t) => t.name === name);
        if (!template) {
            throw new Error(`Template with name ${name} not registered.`);
        }
        return template;
    }
}
