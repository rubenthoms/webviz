import React from "react";

import { GuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { useDashboard } from "@framework/internal/components/DashboardContext";
import { DashboardTopic } from "@framework/internal/Dashboard";
import type { ModuleInstance } from "@framework/ModuleInstance";
import type { Workbench } from "@framework/Workbench";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { ChannelReceiverNodesWrapper } from "./private-components/channelReceiverNodesWrapper";
import { Header } from "./private-components/header";
import { ViewContent } from "./private-components/viewContent";

type ViewWrapperProps = {
    isMaximized?: boolean;
    moduleInstance: ModuleInstance<any, any>;
    workbench: Workbench;
    onHeaderDragStart?: (event: React.DragEvent<HTMLDivElement>) => void;
    onHeaderDragEnd?: (event: React.DragEvent<HTMLDivElement>) => void;
};

/** Renders a module (header and view) filling its parent, which is sized by the layout. */
export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
    const { dashboard } = useDashboard();

    const activeModuleInstanceId = usePublishSubscribeTopicValue(dashboard, DashboardTopic.ACTIVE_MODULE_INSTANCE_ID);
    const isActive = props.moduleInstance.getId() === activeModuleInstanceId;

    const ref = React.useRef<HTMLDivElement>(null);

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelConnectionsLayerVisible = useGuiValue(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible,
    );

    const pointerDownRef = React.useRef<boolean>(false);

    function handleModuleClick() {
        if (dataChannelConnectionsLayerVisible) {
            return;
        }
        if (isActive) return;
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
    }

    function handlePointerDown() {
        pointerDownRef.current = true;
    }

    function handlePointerUp() {
        if (!pointerDownRef.current) {
            return;
        }
        pointerDownRef.current = false;
        handleModuleClick();
    }

    return (
        <div ref={ref} className="px-4xs py-4xs box-border h-full w-full contain-content">
            <div
                className="border-neutral-subtle shadow-elevation-raised bg-surface relative box-border flex h-full w-full flex-col border p-0"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            >
                <div
                    className={resolveClassNames(
                        "z-elevated pointer-events-none absolute inset-0 box-border h-full w-full bg-transparent outline-2",
                        {
                            "outline-accent-strong": isActive,
                            "outline-transparent": !isActive,
                        },
                    )}
                />
                <Header
                    workbench={props.workbench}
                    isMaximized={props.isMaximized}
                    moduleInstance={props.moduleInstance}
                    onDragStart={props.onHeaderDragStart}
                    onDragEnd={props.onHeaderDragEnd}
                />
                <div className="h-0 grow overflow-auto" onClick={handleModuleClick}>
                    <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                    <ChannelReceiverNodesWrapper
                        forwardedRef={ref}
                        moduleInstance={props.moduleInstance}
                        workbench={props.workbench}
                    />
                </div>
            </div>
        </div>
    );
};
