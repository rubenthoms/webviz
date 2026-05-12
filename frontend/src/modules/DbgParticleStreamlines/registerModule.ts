import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces>({
    moduleName: "DbgParticleStreamlines",
    defaultTitle: "Debug: Particle Streamlines",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
});
