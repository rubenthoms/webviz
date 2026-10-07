import React from "react";

import { ModuleActionBarContext } from "@framework/ActionBar";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { ModuleSelectionContextValue } from "@framework/Selection";
import { ModuleSelectionContext } from "@framework/Selection";

import { useDashboard } from "../DashboardContext";

export type ModuleContextProvidersProps = {
    moduleInstance: ModuleInstance<any, any>;
    children: React.ReactNode;
};

/**
 * Provides the framework contexts a module's settings and view trees can reach through hooks
 * (selection, Action Bar contributions). Used at both mounting boundaries of a module instance.
 */
export function ModuleContextProviders(props: ModuleContextProvidersProps): React.ReactNode {
    const { dashboard } = useDashboard();

    const selectionContextValue = React.useMemo<ModuleSelectionContextValue>(() => {
        const selectionService = dashboard.getSelectionService();
        return { reader: selectionService, editor: selectionService.getEditor(props.moduleInstance) };
    }, [dashboard, props.moduleInstance]);

    return (
        <ModuleSelectionContext.Provider value={selectionContextValue}>
            <ModuleActionBarContext.Provider value={props.moduleInstance.getActionBarRegistry()}>
                {props.children}
            </ModuleActionBarContext.Provider>
        </ModuleSelectionContext.Provider>
    );
}
