import React from "react";

import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import { PlotData, newPlot } from "plotly.js";

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

    const handleSettingsPanelResize = React.useCallback(function handleSettingsPanelResize(sizes: number[]) {
        setSettingsPanelWidth(sizes[0]);
        localStorage.setItem("settingsPanelWidthInPercent", sizes[0].toString());
    }, []);

    React.useEffect(() => {
        const graphDiv = document.getElementById("plot");
        if (graphDiv) {
            const data: Partial<PlotData>[] = [
                {
                    x: [1999, 2000, 2001, 2002],
                    y: [10, 15, 13, 17],
                    type: "scatter",
                },
            ];

            const layout = {
                title: "Sales Growth",
                xaxis: {
                    title: "Year",
                    showgrid: false,
                    zeroline: false,
                },
                yaxis: {
                    title: "Percent",
                    showline: false,
                },
            };
            newPlot(graphDiv, data, layout);
        }
    }, []);

    return (
        <ResizablePanels
            id="settings-content"
            direction="horizontal"
            sizesInPercent={[settingsPanelWidth, 100 - settingsPanelWidth]}
            minSizes={[300, 0]}
            onSizesChange={handleSettingsPanelResize}
        >
            <Settings workbench={props.workbench} />
            <div className="flex flex-col flex-grow h-full">
                <div id="plot" />
                <Content workbench={props.workbench} />
            </div>
        </ResizablePanels>
    );
};
