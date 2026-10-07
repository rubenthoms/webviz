import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./shared";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "DbgSelectionActionBar",
    defaultTitle: "Debug Selection & Action Bar",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "Prototype harness for the dashboard selection service and module Action Bar contributions",
});
