import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import type { Interfaces } from "./interfaces";

ModuleRegistry.registerModule<Interfaces, [{ version: 1 }]>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
    portingFunctions: {
        1: (state: { version: 1 }) => {
            return {
                version: 1,
            };
        },
    },
});
