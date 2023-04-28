import React from "react";

import { ModuleInstance } from "@framework/ModuleInstance";
import { SubModuleInstance } from "@framework/SubModuleInstance";

import { ModuleInstanceBase } from "../ModuleInstanceBase";
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

export function useActiveModuleInstance(workbench: Workbench): ModuleInstanceBase<any> | null {
    const [activeModuleInstance, setActiveModuleInstance] = React.useState<ModuleInstanceBase<any> | null>(null);

    React.useEffect(() => {
        function handleActiveModuleChange() {
            setActiveModuleInstance(workbench.getActiveModuleInstance());
        }

        const unsubscribeFunc = workbench.subscribe(WorkbenchEvents.ActiveModuleChanged, handleActiveModuleChange);

        return unsubscribeFunc;
    }, []);

    return activeModuleInstance;
}

export function useModuleInstances(workbench: Workbench): (ModuleInstance<any> | SubModuleInstance<any, any>)[] {
    const [moduleInstances, setModuleInstances] = React.useState<(ModuleInstance<any> | SubModuleInstance<any, any>)[]>(
        []
    );

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
