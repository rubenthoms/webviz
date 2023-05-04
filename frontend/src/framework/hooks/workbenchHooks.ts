import React from "react";

import { MainModuleInstance } from "@framework/MainModuleInstance";
import { SubModuleInstance } from "@framework/SubModuleInstance";

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

export function useModuleInstances(workbench: Workbench): (MainModuleInstance<any> | SubModuleInstance<any, any>)[] {
    const [moduleInstances, setModuleInstances] = React.useState<
        (MainModuleInstance<any> | SubModuleInstance<any, any>)[]
    >([]);

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
