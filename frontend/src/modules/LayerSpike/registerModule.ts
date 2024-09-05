import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

export const MODULE_NAME: string = "LayerSpike";

ModuleRegistry.registerModule({
    moduleName: MODULE_NAME,
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    defaultTitle: "Layer Spike",
});
