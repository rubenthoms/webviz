import React from "react";

import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { Content } from "../Content";
import { Settings } from "../Settings/settings";

export type SettingsContentPanelsProps = {
    workbench: Workbench;
};

export const SettingsContentPanels: React.FC<SettingsContentPanelsProps> = (props) => {
    const [settingsPanelWidth, setSettingsPanelWidth] = useStoreState(
        props.workbench.getGuiStateStore(),
        "settingsPanelWidthInPercent"
    );

    function handleSettingsPanelResize(sizes: number[]) {
        setSettingsPanelWidth(sizes[0]);
    }

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={[settingsPanelWidth, 100 - settingsPanelWidth]}
            minSizes={[300, 0]}
            initialSizesPercent={[25, 75]}
            onSizesChange={handleSettingsPanelResize}
        >
            <Settings workbench={props.workbench} />
            <div className="flex flex-col flex-grow h-full">
                <Content workbench={props.workbench} />
            </div>
        </ResizablePanels>
    );
};
