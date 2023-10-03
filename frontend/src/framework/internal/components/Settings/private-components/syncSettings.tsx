import React from "react";

import { DrawerContent, GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { SyncSettingKey, SyncSettingsMeta } from "@framework/SyncSettings";
import { Workbench } from "@framework/Workbench";
import { Drawer } from "@framework/internal/components/Drawer";
import { Checkbox } from "@lib/components/Checkbox";
import { Link, PinDrop, Public } from "@mui/icons-material";

type ModulesListProps = {
    workbench: Workbench;
};

export const SyncSettings: React.FC<ModulesListProps> = (props) => {
    const forceRerender = React.useReducer((x) => x + 1, 0)[1];
    const drawerContent = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.DrawerContent);
    const activeModuleInstanceId = useGuiValue(props.workbench.getGuiMessageBroker(), GuiState.ActiveModuleInstanceId);

    const activeModuleInstance = props.workbench.getModuleInstanceManager().getModuleInstance(activeModuleInstanceId);

    function handleSyncSettingChange(setting: SyncSettingKey, value: boolean) {
        if (activeModuleInstance === undefined) {
            return;
        }

        if (value) {
            if (!activeModuleInstance.isSyncedSetting(setting)) {
                activeModuleInstance.addSyncedSetting(setting);
            }
        } else {
            activeModuleInstance.removeSyncedSetting(setting);
        }

        forceRerender();
    }

    function handleGlobalSyncSettingChange(setting: SyncSettingKey, value: boolean) {
        const moduleInstances = props.workbench.getModuleInstanceManager().getModuleInstances();

        // @rmt: This has to be changed as soon as we support multiple pages
        for (const moduleInstance of moduleInstances) {
            if (moduleInstance.getModule().hasSyncableSettingKey(setting)) {
                if (value) {
                    if (!moduleInstance.isSyncedSetting(setting)) {
                        moduleInstance.addSyncedSetting(setting);
                    }
                } else {
                    moduleInstance.removeSyncedSetting(setting);
                }
            }
        }

        forceRerender();
    }

    function isGlobalSyncSetting(setting: SyncSettingKey): boolean {
        const moduleInstances = props.workbench.getModuleInstanceManager().getModuleInstances();

        // @rmt: This has to be changed as soon as we support multiple pages
        for (const moduleInstance of moduleInstances) {
            if (moduleInstance.getModule().hasSyncableSettingKey(setting)) {
                if (!moduleInstance.isSyncedSetting(setting)) {
                    return false;
                }
            }
        }

        return true;
    }

    function makeContent() {
        const syncableSettingKeys = activeModuleInstance?.getModule().getSyncableSettingKeys() ?? [];

        if (activeModuleInstanceId === "" || activeModuleInstance === undefined) {
            return <div className="text-gray-500">No module selected</div>;
        }

        if (syncableSettingKeys.length === 0) {
            return <div className="text-gray-500">No syncable settings</div>;
        }

        return (
            <table className="w-full">
                <thead>
                    <tr className="border-b">
                        <th className="border-r p-2 w-6" title="Sync for all module instances">
                            <Public fontSize="small" />
                        </th>
                        <th className="border-r p-2 w-6" title="Sync for active module instance">
                            <PinDrop fontSize="small" />
                        </th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {syncableSettingKeys.map((setting) => {
                        const globallySynced = isGlobalSyncSetting(setting);
                        return (
                            <tr key={setting} className="hover:bg-blue-50">
                                <td className="border-r p-2">
                                    <Checkbox
                                        checked={globallySynced}
                                        onChange={(e) => handleGlobalSyncSettingChange(setting, e.target.checked)}
                                    />
                                </td>
                                <td className="border-r p-2">
                                    <Checkbox
                                        checked={globallySynced || activeModuleInstance.isSyncedSetting(setting)}
                                        onChange={(e) => handleSyncSettingChange(setting, e.target.checked)}
                                    />
                                </td>
                                <td className="p-2">{SyncSettingsMeta[setting].name}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    return (
        <Drawer title="Sync settings" icon={<Link />} visible={drawerContent === DrawerContent.SyncSettings}>
            {makeContent()}
        </Drawer>
    );
};
