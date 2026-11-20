import React from "react";

import type {
    InterfaceBaseType,
    UniDirectionalModuleComponentsInterface,
} from "../UniDirectionalModuleComponentsInterface";

import type { ChannelManager } from "./DataChannels/ChannelManager";
import type { ModuleInstanceStatusManager } from "./ModuleInstanceStatusManager";

/**
 * The parts of a module instance that module hooks can use. Deliberately limited: the view and settings
 * components (and everything rendered within them) get no further access to the module instance.
 */
export type ModuleInstanceReactContextValue = {
    getStatusManager(): Pick<ModuleInstanceStatusManager, "setGroup" | "clearGroup" | "setLoading">;
    getChannelManager(): ChannelManager;
    getUniDirectionalSettingsToViewInterface(): UniDirectionalModuleComponentsInterface<InterfaceBaseType>;
    getUniDirectionalViewToSettingsInterface(): UniDirectionalModuleComponentsInterface<InterfaceBaseType>;
};

/**
 * Provided by the framework around a module instance's view and settings.
 */
export const ModuleInstanceReactContext = React.createContext<ModuleInstanceReactContextValue | null>(null);

export function useModuleInstanceReactContext(): ModuleInstanceReactContextValue {
    const value = React.useContext(ModuleInstanceReactContext);
    if (!value) {
        throw new Error("Module hooks can only be used within a module's view or settings");
    }
    return value;
}
