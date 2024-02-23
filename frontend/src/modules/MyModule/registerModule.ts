import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_SERIALIZED_STATE, ModuleSerializedState } from "./persistence";
import { State } from "./state";

ModuleRegistry.registerModule<
    State,
    { baseStates: Record<string, never>; derivedStates: Record<string, never> },
    ModuleSerializedState
>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    serializedStateDefinition: MODULE_SERIALIZED_STATE,
});
