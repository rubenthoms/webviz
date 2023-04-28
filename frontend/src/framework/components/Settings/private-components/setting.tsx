import React from "react";

import { ImportState, ModuleType } from "@framework/ModuleBase";
import { ModuleInstance } from "@framework/ModuleInstance";
import { ModuleInstanceBase } from "@framework/ModuleInstanceBase";
import { SubModuleInstance } from "@framework/SubModuleInstance";
import { Workbench } from "@framework/Workbench";
import { useImportState } from "@framework/hooks/moduleHooks";

type SettingProps = {
    moduleInstance: ModuleInstance<any> | SubModuleInstance<any, any>;
    activeModuleId: string;
    workbench: Workbench;
};

export const Setting: React.FC<SettingProps> = (props) => {
    const importState = useImportState(props.moduleInstance);

    if (importState !== ImportState.Imported || !props.moduleInstance.isInitialised()) {
        return null;
    }

    let Settings = props.moduleInstance.getSettingsFC();

    if (!Settings) {
        return null;
    }

    const makeContent = () => {
        if (props.moduleInstance.getModule().getType() === ModuleType.MainModule) {
            Settings = (props.moduleInstance as ModuleInstance<any>).getSettingsFC();
            return (
                <Settings
                    moduleContext={(props.moduleInstance as ModuleInstance<any>).getContext()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                />
            );
        } else {
            Settings = (props.moduleInstance as SubModuleInstance<any, any>).getSettingsFC();
            return (
                <Settings
                    moduleContext={(props.moduleInstance as SubModuleInstance<any, any>).getContext()}
                    workbenchServices={props.workbench.getWorkbenchServices()}
                />
            );
        }
    };

    return (
        <div
            key={props.moduleInstance.getId()}
            style={{
                display: props.activeModuleId === props.moduleInstance.getId() ? "flex" : "none",
            }}
            className="flex-col gap-4"
        >
            {makeContent()}
        </div>
    );
};
