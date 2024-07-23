import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { Interfaces } from "./interfaces";
import { preview } from "./preview";
import { ViewAtoms } from "./view/atoms/atomDefinitions";

export const MODULE_NAME = "Intersection";

ModuleRegistry.registerModule<Interfaces, Record<string, never>, ViewAtoms>({
    moduleName: MODULE_NAME,
    defaultTitle: "Intersection",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    description: "Intersection",
    preview,
    syncableSettingKeys: [
        SyncSettingKey.ENSEMBLE,
        SyncSettingKey.INTERSECTION,
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        SyncSettingKey.VERTICAL_SCALE,
    ],
});
