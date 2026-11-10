import type React from "react";

import { DashboardTopic } from "@framework/internal/Dashboard";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../ActiveDashboardBoundary";

import { EmptySettingsPlaceholder } from "./private-components/emptySettingsPlaceholder";
import { ModuleSettingsHeader } from "./private-components/moduleSettingsHeader";
import { ModuleSettingsStack } from "./private-components/moduleSettingsStack";
import { ModuleSyncSettings } from "./private-components/moduleSyncSettings";

type ModuleSettingsPanelProps = {
    workbench: Workbench;
};

/** The settings of the active module */
export function ModuleSettingsPanel(props: ModuleSettingsPanelProps): React.ReactNode {
    const dashboard = useActiveDashboard();
    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const activeModuleInstance = activeModuleInstanceId ? dashboard.getModuleInstance(activeModuleInstanceId) : null;

    return (
        <div className="bg-surface flex h-full flex-col overflow-hidden">
            <ModuleSettingsHeader activeModuleInstance={activeModuleInstance} />
            <div className="flex min-h-0 w-full flex-1 flex-col">
                <ModuleSettingsStack workbench={props.workbench} />
                {!activeModuleInstanceId && <EmptySettingsPlaceholder text="No module selected" />}
            </div>
        </div>
    );
}

type SyncSettingsPanelProps = {
    workbench: Workbench;
};

/** The sync settings of the active module */
export function SyncSettingsPanel(props: SyncSettingsPanelProps): React.ReactNode {
    return <ModuleSyncSettings workbench={props.workbench} visible />;
}
