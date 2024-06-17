import { ModuleCategory, ModuleDevState } from "@framework/Module";
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
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "My module description",
    serializedStateDefinition: MODULE_SERIALIZED_STATE,
});
