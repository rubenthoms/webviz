import React from "react";

import { useStoreState } from "@framework/StateStore";
import { Workbench } from "@framework/Workbench";
import { ResizablePanels } from "@lib/components/ResizablePanels";

import Plotly, { PlotData, PlotHoverEvent, PlotMouseEvent, PlotlyHTMLElement } from "plotly.js-dist-min";

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
        const graphDiv = document.getElementById("plot") as PlotlyHTMLElement;
        if (graphDiv) {
            const data: Partial<PlotData>[] = Array(100)
                .fill(0)
                .map((el, idx) => ({
                    x: Array(100)
                        .fill(0)
                        .map((el, index) => index),
                    y: Array(100)
                        .fill(0)
                        .map((el, index) => index + idx),
                    type: "scatter",
                    marker: {
                        color: "blue",
                    },
                }));

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
            Plotly.newPlot(graphDiv, data, layout);
            graphDiv.on("plotly_hover", function (data: PlotHoverEvent) {
                if (data.points) {
                    console.debug(data.points);
                    Plotly.restyle(
                        graphDiv,
                        {
                            "marker.color": "red",
                        },
                        [data.points[0].curveNumber]
                    );
                }
            });
            graphDiv.on("plotly_unhover", function (data: PlotMouseEvent) {
                if (data.points) {
                    Plotly.restyle(
                        graphDiv,
                        {
                            "marker.color": "blue",
                        },
                        [data.points[0].curveNumber]
                    );
                }
            });
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
