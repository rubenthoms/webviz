import React from "react";

import { MainModuleInstance } from "@framework/MainModuleInstance";
import { ImportState, ModuleType } from "@framework/Module";
import { SubModuleInstance } from "@framework/SubModuleInstance";
import { Workbench } from "@framework/Workbench";
import { useImportState } from "@framework/hooks/moduleHooks";

type SettingProps = {
    moduleInstance: MainModuleInstance<any> | SubModuleInstance<any, any>;
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
            Settings = (props.moduleInstance as MainModuleInstance<any>).getSettingsFC();
            return (
                <Settings
                    moduleContext={(props.moduleInstance as MainModuleInstance<any>).getContext()}
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
