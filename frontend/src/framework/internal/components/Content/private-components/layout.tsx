import React from "react";

import { WebAssetOff } from "@mui/icons-material";

import {
    GuiEvent,
    GuiState,
    requestSettingsPanel,
    SettingsPanel,
    useGuiValue,
    type GuiEventPayloads,
} from "@framework/GuiMessageBroker";
import { useDashboard } from "@framework/internal/components/DashboardContext";
import { DashboardTopic, type LayoutElement } from "@framework/internal/Dashboard";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { type Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Paragraph } from "@lib/components/Typography/compositions";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveSession } from "../../ActiveSessionBoundary";

import { DockviewModuleLayout, type ModuleDragHandlers } from "./dockviewLayout/dockviewModuleLayout";
import { ViewWrapper } from "./ViewWrapper";
import { Header } from "./ViewWrapper/private-components/header";

type LayoutProps = {
    workbench: Workbench;
};

export const Layout: React.FC<LayoutProps> = (props) => {
    const { dashboard, isActive: isActiveDashboard } = useDashboard();
    const moduleInstances = usePublishSubscribeTopicValue(dashboard, DashboardTopic.MODULE_INSTANCES);
    const layout = usePublishSubscribeTopicValue(dashboard, DashboardTopic.LAYOUT);
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const isSwitchingDashboard = useGuiValue(guiMessageBroker, GuiState.IsSwitchingDashboard);
    const activeSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const maximizedModuleInstanceId = layout.find((element) => element.maximized)?.moduleInstanceId ?? null;

    React.useEffect(
        function subscribeToRemoveModuleInstanceRequests() {
            if (!isActiveDashboard) {
                return;
            }

            function handleRemoveModuleInstanceRequest(
                payload: GuiEventPayloads[GuiEvent.RemoveModuleInstanceRequest],
            ) {
                if (!dashboard.getModuleInstance(payload.moduleInstanceId)) {
                    return;
                }
                // The layout follows: the dashboard drops the module's layout element, and dockview gives its space
                // to the neighbours
                dashboard.removeModuleInstance(payload.moduleInstanceId);
            }

            return guiMessageBroker.subscribeToEvent(
                GuiEvent.RemoveModuleInstanceRequest,
                handleRemoveModuleInstanceRequest,
            );
        },
        [guiMessageBroker, dashboard, isActiveDashboard],
    );

    const handleLayoutChange = React.useCallback(
        function handleLayoutChange(newLayout: LayoutElement[]) {
            // Dockview only knows the geometry; keep the maximized/minimized flags
            const currentLayout = dashboard.getLayout();
            dashboard.setLayout(
                newLayout.map((element) => {
                    const current = currentLayout.find((el) => el.moduleInstanceId === element.moduleInstanceId);
                    return { ...element, maximized: current?.maximized, minimized: current?.minimized };
                }),
            );
        },
        [dashboard],
    );

    const handleNewModuleDrop = React.useCallback(
        function handleNewModuleDrop(moduleName: string) {
            if (isSnapshot) {
                return null;
            }
            const instance = dashboard.makeAndAddModuleInstance(moduleName);
            return { moduleInstanceId: instance.getId(), moduleName: instance.getName() };
        },
        [dashboard, isSnapshot],
    );

    const renderModule = React.useCallback(
        function renderModule(moduleInstanceId: string, dragHandlers: ModuleDragHandlers) {
            const moduleInstance = moduleInstances.find((instance) => instance.getId() === moduleInstanceId);
            if (!moduleInstance) {
                return null;
            }
            return (
                <ViewWrapper
                    moduleInstance={moduleInstance}
                    workbench={props.workbench}
                    isMaximized={moduleInstanceId === maximizedModuleInstanceId}
                    onHeaderDragStart={dragHandlers.onDragStart}
                    onHeaderDragEnd={dragHandlers.onDragEnd}
                />
            );
        },
        [moduleInstances, props.workbench, maximizedModuleInstanceId],
    );

    const minimizedModuleInstances = maximizedModuleInstanceId
        ? moduleInstances.filter((instance) => instance.getId() !== maximizedModuleInstanceId)
        : [];

    const showEmptyLayout = moduleInstances.length === 0 && !isSwitchingDashboard;

    return (
        <div className="flex h-full w-full max-w-full flex-col">
            {minimizedModuleInstances.length > 0 && (
                // While a module is maximized, the others are shown as headers only; their views stay mounted in
                // the (hidden) dockview groups
                <div className="grid shrink-0 grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
                    {minimizedModuleInstances.map((instance) => (
                        <div key={instance.getId()} className="border-neutral-subtle border">
                            <Header workbench={props.workbench} moduleInstance={instance} isMinimized />
                        </div>
                    ))}
                </div>
            )}
            <div data-testid="module-layout" className="relative min-h-0 grow">
                <DockviewModuleLayout
                    layout={layout}
                    onLayoutChange={handleLayoutChange}
                    renderModule={renderModule}
                    onNewModuleDrop={handleNewModuleDrop}
                    maximizedModuleInstanceId={maximizedModuleInstanceId}
                    readOnly={isSnapshot}
                    emptyContent={showEmptyLayout ? <EmptyLayout workbench={props.workbench} /> : null}
                />
                {isSwitchingDashboard && (
                    // Covers the outgoing dashboard's content the instant a tab switch is
                    // requested (before the still-synchronous switch itself runs and blocks the
                    // main thread for a moment)
                    <div className="bg-surface/80 z-overlay absolute inset-0 flex items-center justify-center backdrop-blur-xs">
                        <CircularProgress size={40} />
                    </div>
                )}
            </div>
        </div>
    );
};

type EmptyLayoutProps = {
    workbench: Workbench;
};

function EmptyLayout(props: EmptyLayoutProps) {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const visibleSettingsPanels = useGuiValue(guiMessageBroker, GuiState.VisibleSettingsPanels);
    const activeSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(activeSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    function openModulesList() {
        requestSettingsPanel(guiMessageBroker, SettingsPanel.ModulesList);
    }

    function makeContent() {
        if (isSnapshot) {
            return (
                <Paragraph size="md" weight="bolder" tone="neutral" layoutClassName="text-center">
                    This dashboard does not contain any modules.
                </Paragraph>
            );
        }
        return (
            <>
                <Paragraph size="md" weight="bolder" tone="neutral" layoutClassName="text-center">
                    No modules added
                </Paragraph>
                <Paragraph size="sm" tone="neutral" layoutClassName="text-center">
                    Drag modules here from the modules list.
                </Paragraph>
                {!visibleSettingsPanels.includes(SettingsPanel.ModulesList) && (
                    <Button onClick={openModulesList}>Open Modules List</Button>
                )}
            </>
        );
    }

    return (
        <div className="text-neutral-subtle gap-y-sm absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center select-none">
            <WebAssetOff fontSize="large" />
            {makeContent()}
        </div>
    );
}
