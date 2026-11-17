import { ModuleCategory, ModuleDevState, type ModuleInterfaceTypes } from "@framework/Module";
import { ModuleRegistry } from "@framework/ModuleRegistry";

ModuleRegistry.registerModule<ModuleInterfaceTypes>({
    moduleName: "DbgQueryErrors",
    defaultTitle: "Debug Query Errors",
    category: ModuleCategory.DEBUG,
    devState: ModuleDevState.DEV,
    description: "Trigger backend errors to inspect HTTP mappings, query error toasts, and Retry actions.",
});
