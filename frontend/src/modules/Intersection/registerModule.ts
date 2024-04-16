import { ModuleRegistry } from "@framework/ModuleRegistry";

import { preview } from "./preview";
import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export const MODULE_NAME = "Intersection";

ModuleRegistry.registerModule<State, SettingsToViewInterface>({
    moduleName: MODULE_NAME,
    defaultTitle: "Intersection",
    description: "Intersection",
    preview,
});
