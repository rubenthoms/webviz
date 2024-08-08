import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { State } from "./state";

export const MODULE_NAME = "2DViewer";

ModuleRegistry.registerModule<State>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.DEV,
    defaultTitle: "2D Viewer",
});
