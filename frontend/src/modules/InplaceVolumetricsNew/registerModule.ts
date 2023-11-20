import { ModuleRegistry } from "@framework/ModuleRegistry";

import { channels } from "./channels";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "InplaceVolumetricsNew",
    defaultTitle: "Inplace Volumetrics (new)",
    description: "A module for comparing and investigating responses.",
    newChannels: channels,
});
