import React from "react";

import { FilterAlt, History, Link, Palette, Settings, WebAsset } from "@mui/icons-material";

import { GuiState, SettingsPanel, useGuiValue } from "@framework/GuiMessageBroker";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../ActiveSessionBoundary";
import { Content } from "../Content";
import { DrawerHasExternalHeaderContext } from "../Drawer";
import { ModuleSettingsPanel, SyncSettingsPanel } from "../ModuleSettingsPanels";
import { ModulesList } from "../ModulesList";
import { SettingsDock, SettingsDockController, type SettingsDockPanel } from "../SettingsDock";
import { ColorPaletteSettings, ModuleInstanceLog, RealizationFilterPanel } from "../WorkbenchSettingsPanels";

const SETTINGS_DOCK_STORAGE_KEY = "webviz.settingsDockLayout";

export type WorkbenchSettingsDockProps = {
    workbench: Workbench;
};

/**
 * The module layout with the workbench's settings panels docked around it. Other parts of the app show or hide panels
 * through `requestSettingsPanel`, and read which panels are visible from `GuiState.VisibleSettingsPanels`.
 */
export function WorkbenchSettingsDock(props: WorkbenchSettingsDockProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [controller] = React.useState(() => new SettingsDockController());

    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);
    const numberOfUnsavedRealizationFilters = useGuiValue(guiMessageBroker, GuiState.NumberOfUnsavedRealizationFilters);
    const numberOfEffectiveRealizationFilters = useGuiValue(
        guiMessageBroker,
        GuiState.NumberOfEffectiveRealizationFilters,
    );
    const { visiblePanelIds } = React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);

    const center = React.useMemo(
        () => (
            <div className="flex h-full grow flex-col">
                <Content workbench={props.workbench} />
            </div>
        ),
        [props.workbench],
    );

    const contents = React.useMemo(
        function makePanelContents() {
            function close(panel: SettingsPanel) {
                return () => controller.closePanel(panel);
            }
            return {
                [SettingsPanel.ModuleSettings]: <ModuleSettingsPanel workbench={props.workbench} />,
                [SettingsPanel.SyncSettings]: <SyncSettingsPanel workbench={props.workbench} />,
                [SettingsPanel.ModulesList]: (
                    <ModulesList workbench={props.workbench} onClose={close(SettingsPanel.ModulesList)} />
                ),
                [SettingsPanel.RealizationFilterSettings]: <RealizationFilterPanel workbench={props.workbench} />,
                [SettingsPanel.ModuleInstanceLog]: (
                    <ModuleInstanceLog workbench={props.workbench} onClose={close(SettingsPanel.ModuleInstanceLog)} />
                ),
                [SettingsPanel.ColorPaletteSettings]: (
                    <ColorPaletteSettings
                        workbench={props.workbench}
                        onClose={close(SettingsPanel.ColorPaletteSettings)}
                    />
                ),
            };
        },
        [controller, props.workbench],
    );

    const panels = React.useMemo<SettingsDockPanel[]>(
        () => [
            {
                id: SettingsPanel.ModuleSettings,
                title: "Module settings",
                icon: <Settings fontSize="inherit" />,
                defaultEdge: "left",
                initiallyOpen: true,
                content: contents[SettingsPanel.ModuleSettings],
            },
            {
                id: SettingsPanel.SyncSettings,
                title: "Sync settings",
                icon: <Link fontSize="inherit" />,
                defaultEdge: "left",
                initiallyOpen: true,
                content: contents[SettingsPanel.SyncSettings],
            },
            {
                id: SettingsPanel.ModulesList,
                title: "Modules",
                icon: <WebAsset fontSize="inherit" />,
                defaultEdge: "right",
                content: contents[SettingsPanel.ModulesList],
                disabled: isSnapshot,
                disabledTooltip: "Modules cannot be changed in snapshot mode",
                railTestId: "modules-list-open-button",
            },
            {
                id: SettingsPanel.RealizationFilterSettings,
                title: "Realization filter",
                icon: (
                    <RealizationFilterIcon
                        numberOfUnsavedRealizationFilters={numberOfUnsavedRealizationFilters}
                        numberOfEffectiveRealizationFilters={numberOfEffectiveRealizationFilters}
                    />
                ),
                defaultEdge: "right",
                content: contents[SettingsPanel.RealizationFilterSettings],
                disabled: isSnapshot,
                disabledTooltip: "Realization filters cannot be changed in snapshot mode",
            },
            {
                id: SettingsPanel.ModuleInstanceLog,
                title: "Module log",
                icon: <History fontSize="inherit" />,
                defaultEdge: "right",
                content: contents[SettingsPanel.ModuleInstanceLog],
            },
            {
                id: SettingsPanel.ColorPaletteSettings,
                title: "Color palettes",
                icon: <Palette fontSize="inherit" />,
                defaultEdge: "right",
                content: contents[SettingsPanel.ColorPaletteSettings],
            },
        ],
        [contents, isSnapshot, numberOfUnsavedRealizationFilters, numberOfEffectiveRealizationFilters],
    );

    React.useEffect(
        function handleSettingsPanelRequests() {
            function processRequests() {
                const requests = guiMessageBroker.getState(GuiState.SettingsPanelRequests);
                if (requests.length === 0 || !controller.getApi()) {
                    return;
                }
                guiMessageBroker.setState(GuiState.SettingsPanelRequests, []);
                for (const request of requests) {
                    if (request.action === "show") {
                        controller.showPanel(request.panel);
                    } else {
                        controller.hidePanel(request.panel);
                    }
                }
            }

            // Requests made before the dock was mounted, e.g. while loading the session
            processRequests();
            const unsubscribeFromRequests = guiMessageBroker.makeStateSubscriberFunction(
                GuiState.SettingsPanelRequests,
            )(processRequests);
            // The dock's layout becomes available a little after mounting
            const unsubscribeFromDock = controller.subscribe(processRequests);
            return () => {
                unsubscribeFromRequests();
                unsubscribeFromDock();
            };
        },
        [controller, guiMessageBroker],
    );

    React.useEffect(
        function publishVisibleSettingsPanels() {
            guiMessageBroker.setState(GuiState.VisibleSettingsPanels, visiblePanelIds as SettingsPanel[]);
        },
        [guiMessageBroker, visiblePanelIds],
    );

    return (
        <DrawerHasExternalHeaderContext.Provider value={true}>
            <SettingsDock
                center={center}
                panels={panels}
                controller={controller}
                storageKey={SETTINGS_DOCK_STORAGE_KEY}
            />
        </DrawerHasExternalHeaderContext.Provider>
    );
}

type RealizationFilterIconProps = {
    numberOfUnsavedRealizationFilters: number;
    numberOfEffectiveRealizationFilters: number;
};

function RealizationFilterIcon(props: RealizationFilterIconProps): React.ReactNode {
    return (
        <Badge
            badgeContent={
                props.numberOfUnsavedRealizationFilters ? "!" : props.numberOfEffectiveRealizationFilters || undefined
            }
            tone={props.numberOfUnsavedRealizationFilters ? "warning" : "accent"}
            invisible={!props.numberOfUnsavedRealizationFilters && !props.numberOfEffectiveRealizationFilters}
            corner="top-left"
        >
            <FilterAlt fontSize="inherit" />
        </Badge>
    );
}
