import React from "react";

import { ModuleInstance } from "../ModuleInstance";
import { Workbench, WorkbenchEvents } from "../Workbench";

export function useActiveModuleInstanceId(workbench: Workbench): string {
    const [activeModuleId, setActiveModuleId] = React.useState<string>("");

    React.useEffect(() => {
        function handleActiveModuleChange() {
            setActiveModuleId(workbench.getActiveModuleId());
        }

        const unsubscribeFunc = workbench.subscribe(WorkbenchEvents.ActiveModuleChanged, handleActiveModuleChange);

        return unsubscribeFunc;
    }, []);

    return activeModuleId;
}

export function useActiveModuleInstance(workbench: Workbench): ModuleInstance<any> | null {
    const [activeModuleInstance, setActiveModuleInstance] = React.useState<ModuleInstance<any> | null>(null);

    React.useEffect(() => {
        function handleActiveModuleChange() {
            setActiveModuleInstance(workbench.getActiveModuleInstance());
        }

        const unsubscribeFunc = workbench.subscribe(WorkbenchEvents.ActiveModuleChanged, handleActiveModuleChange);

        return unsubscribeFunc;
    }, []);

    return activeModuleInstance;
}

export function useModuleInstances(workbench: Workbench): ModuleInstance<any>[] {
    const [moduleInstances, setModuleInstances] = React.useState<ModuleInstance<any>[]>([]);

    React.useEffect(() => {
        function handleModuleInstancesChange() {
            setModuleInstances(workbench.getModuleInstances());
        }

        const unsubscribeFunc = workbench.subscribe(
            WorkbenchEvents.ModuleInstancesChanged,
            handleModuleInstancesChange
        );

        return unsubscribeFunc;
    }, []);

    return moduleInstances;
}
