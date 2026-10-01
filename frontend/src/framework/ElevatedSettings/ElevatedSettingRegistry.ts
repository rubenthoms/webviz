import { ElevatedSettingDefinition, type ElevatedSettingOptions } from "./ElevatedSettingDefinition";

export class ElevatedSettingRegistry {
    // Insertion-ordered - the registration order is the display order of active elevated settings.
    private static _registeredSettings = new Map<string, ElevatedSettingDefinition<any, any>>();

    private constructor() {}

    static registerElevatedSetting<TValue, TConstraints>(
        options: ElevatedSettingOptions<TValue, TConstraints>,
    ): ElevatedSettingDefinition<TValue, TConstraints> {
        if (this._registeredSettings.has(options.key)) {
            throw new Error(`Elevated setting with key '${options.key}' is already registered.`);
        }

        const settingDefinition = new ElevatedSettingDefinition<TValue, TConstraints>(options);
        this._registeredSettings.set(options.key, settingDefinition);
        return settingDefinition;
    }

    static getRegisteredSetting(key: string): ElevatedSettingDefinition<any, any> | undefined {
        return this._registeredSettings.get(key);
    }

    static getRegisteredSettings(): ElevatedSettingDefinition<any, any>[] {
        return Array.from(this._registeredSettings.values());
    }

    // Unregistered keys (e.g. test-only definitions) sort last.
    static getRegistrationIndex(key: string): number {
        const index = Array.from(this._registeredSettings.keys()).indexOf(key);
        return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    }
}
