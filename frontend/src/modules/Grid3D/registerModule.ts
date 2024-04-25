import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "Grid3D";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "3D Viewer",
    description: "3D Viewer",
    preview,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.INTERSECTION],
});
