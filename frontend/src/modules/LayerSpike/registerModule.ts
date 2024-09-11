import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Interfaces } from "./interfaces";

export const MODULE_NAME: string = "LayerSpike";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: MODULE_NAME,
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    defaultTitle: "Layer Spike",
});
