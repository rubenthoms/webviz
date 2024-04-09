import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "Grid3DIntersection";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Grid 3D Intersection",
    description: "Grid 3D Intersection",
    preview,
});
