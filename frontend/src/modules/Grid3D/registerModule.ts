import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "Grid3D";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Grid 3D",
    description: "Grid 3D",
    preview,
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.INTERSECTION],
});
