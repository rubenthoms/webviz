import { ModuleCategory, ModuleDevState } from "@framework/Module";
import { ModuleDataTagId } from "@framework/ModuleDataTags";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_SERIALIZED_STATE, ModuleSerializedState } from "./persistence";
import { preview } from "./preview";
import { Interface, State } from "./state";

export const MODULE_NAME = "Pvt";

const description =
    "Visualizes formation volume factor and viscosity data for oil, gas, and water from Eclipse init and include files.";

ModuleRegistry.registerModule<State, Interface, Record<string, never>, Record<string, never>, ModuleSerializedState>({
    moduleName: MODULE_NAME,
    defaultTitle: "PVT",
    category: ModuleCategory.MAIN,
    devState: ModuleDevState.PROD,
    dataTagIds: [ModuleDataTagId.PVT],
    preview,
    description,
    serializedStateDefinition: MODULE_SERIALIZED_STATE,
});
