import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_SERIALIZED_STATE, ModuleSerializedState } from "./persistence";
import { preview } from "./preview";
import { Interface, State } from "./state";

export const MODULE_NAME = "Pvt";

ModuleRegistry.registerModule<State, Interface, ModuleSerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "PVT",
    preview,
    serializedStateDefinition: MODULE_SERIALIZED_STATE,
});
