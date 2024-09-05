import { v4 } from "uuid";

import { Item } from "./ItemBase";
import { SettingsContext } from "./SettingsContext";

export class LayerBase implements Item {
    private _name: string;
    private _id: string;
    private _settingsContext: SettingsContext;

    constructor(name: string, settingsContext: SettingsContext) {
        this._id = v4();
        this._name = name;
        this._settingsContext = settingsContext;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    getSettingsContext(): SettingsContext {
        return this._settingsContext;
    }
}
