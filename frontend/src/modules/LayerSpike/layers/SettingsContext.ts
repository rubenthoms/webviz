import { SettingBase } from "./Setting";

export class SettingsContext {
    private _settings: SettingBase<any>[] = [];
    private _values: unknown[] = [];

    constructor(settings: SettingBase<any>[]) {
        this._settings = settings;
    }

    private maybeFetchData() {}

    getSettings() {
        return this._settings;
    }
}
