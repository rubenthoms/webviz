import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_SERIALIZED_STATE, deserializeModuleState, serializeModuleState } from "./persistence";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    description: "My module description",
});

ModuleRegistry.registerModule<
    State,
    { baseStates: Record<string, never>; derivedStates: Record<string, never> },
    typeof MODULE_SERIALIZED_STATE
>({
    moduleName: "MyModule",
    defaultTitle: "My Module",
    serialization: {
        serializedStateDefinition: MODULE_SERIALIZED_STATE,
        stateSerializer: serializeModuleState,
        stateDeserializer: deserializeModuleState,
    },
});
