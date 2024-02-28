import React from "react";

import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { LeftSettingsPanel } from "../LeftSettingsPanel";
import { MessageStack } from "../MessageStack/messageStack";
import { RightSettingsPanel } from "../RightSettingsPanel";

export type SettingsContentPanelsProps = {
    workbench: Workbench;
};

export const SettingsContentPanels: React.FC<SettingsContentPanelsProps> = (props) => {
    const [leftSettingsPanelWidth, setLeftSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelWidthInPercent
    );
    const [rightSettingsPanelWidth, setRightSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelWidthInPercent
    );
    const [, setRightSettingsPanelExpanded] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.RightSettingsPanelExpanded
    );

    const handleResizablePanelsChange = React.useCallback(
        function handleResizablePanelsChange(sizes: number[]) {
            setLeftSettingsPanelWidth(sizes[0]);
            setRightSettingsPanelWidth(sizes[2]);
            setRightSettingsPanelExpanded(sizes[2] > 0.0);
        },
        [setLeftSettingsPanelWidth, setRightSettingsPanelWidth, setRightSettingsPanelExpanded]
    );

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={[
                leftSettingsPanelWidth,
                100 - leftSettingsPanelWidth - rightSettingsPanelWidth,
                rightSettingsPanelWidth,
            ]}
            minSizes={[300, 0, 300]}
            onSizesChange={handleResizablePanelsChange}
        >
            <LeftSettingsPanel workbench={props.workbench} />
            <div className="flex flex-col flex-grow h-full relative">
                <Content workbench={props.workbench} />
                <MessageStack guiMessageBroker={props.workbench.getGuiMessageBroker()} />
            </div>
            <RightSettingsPanel workbench={props.workbench} />
        </ResizablePanels>
    );
};
