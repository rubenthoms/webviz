import React from "react";
import Plot from "react-plotly.js";

import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useBusinessLogic } from "@framework/ModuleBusinessLogic";
import { useSubscribedValue } from "@framework/WorkbenchServices";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData, PlotDatum, PlotHoverEvent } from "plotly.js";

import { BusinessLogic } from "./businessLogic";
import { useHistoricalVectorDataQuery, useStatisticalVectorDataQuery, useVectorDataQuery } from "./queryHooks";
import { State } from "./state";

interface MyPlotData extends Partial<PlotData> {
    realizationNumber?: number | null;

    // Did they forget to expose this one
    legendrank?: number;
}

export const View = ({
    moduleContext,
    workbenchSession,
    workbenchServices,
    businessLogic,
}: ModuleFCProps<State, BusinessLogic>) => {
    const state = useBusinessLogic(businessLogic);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);

    const subscribedHoverTimestamp = useSubscribedValue("global.hoverTimestamp", workbenchServices);
    const subscribedHoverRealization = useSubscribedValue("global.hoverRealization", workbenchServices);

    function handleHover(e: PlotHoverEvent) {
        const plotDatum: PlotDatum = e.points[0];

        if (plotDatum.pointIndex >= 0 && plotDatum.pointIndex < plotDatum.data.x.length) {
            const timestampUtcMs = plotDatum.data.x[plotDatum.pointIndex];
            if (typeof timestampUtcMs === "number")
                workbenchServices.publishGlobalData("global.hoverTimestamp", { timestampUtcMs: timestampUtcMs });
        }

        const curveData = plotDatum.data as MyPlotData;
        if (typeof curveData.realizationNumber === "number") {
            workbenchServices.publishGlobalData("global.hoverRealization", {
                realization: curveData.realizationNumber,
            });
        }
    }

    function handleUnHover() {
        workbenchServices.publishGlobalData("global.hoverRealization", null);
        workbenchServices.publishGlobalData("global.hoverTimestamp", null);
    }

    const tracesDataArr: MyPlotData[] = [];

    if (showRealizations && vectorQuery.data && vectorQuery.data.length > 0) {
        let highlightedTrace: MyPlotData | null = null;
        for (let i = 0; i < vectorQuery.data.length; i++) {
            const vec = vectorQuery.data[i];
            const isHighlighted = vec.realization === subscribedHoverRealization?.realization ? true : false;
            const curveColor = vec.realization === subscribedHoverRealization?.realization ? "red" : "green";
            const lineWidth = vec.realization === subscribedHoverRealization?.realization ? 3 : 1;
            const lineShape = vec.is_rate ? "vh" : "linear";
            const trace: MyPlotData = {
                x: vec.timestamps_utc_ms,
                y: vec.values,
                name: `real-${vec.realization}`,
                realizationNumber: vec.realization,
                legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
                line: { color: curveColor, width: lineWidth, shape: lineShape },
            };

            if (isHighlighted) {
                highlightedTrace = trace;
            } else {
                tracesDataArr.push(trace);
            }
        }

        if (highlightedTrace) {
            tracesDataArr.push(highlightedTrace);
        }
    }

    if (showStatistics && statisticsQuery.data) {
        const lineShape = statisticsQuery.data.is_rate ? "vh" : "linear";
        for (const statValueObj of statisticsQuery.data.value_objects) {
            const trace: MyPlotData = {
                x: statisticsQuery.data.timestamps_utc_ms,
                y: statValueObj.values,
                name: statValueObj.statistic_function,
                legendrank: -1,
                type: "scatter",
                mode: "lines",
                line: { color: "lightblue", width: 2, dash: "dot", shape: lineShape },
            };
            tracesDataArr.push(trace);
        }
    }

    if (showHistorical && historicalQuery.data) {
        const lineShape = historicalQuery.data.is_rate ? "vh" : "linear";
        const trace: MyPlotData = {
            x: historicalQuery.data.timestamps_utc_ms,
            y: historicalQuery.data.values,
            name: "History",
            legendrank: -1,
            type: "scatter",
            mode: "lines",
            line: { color: "black", width: 2, shape: lineShape },
        };
        tracesDataArr.push(trace);
    }

    const hasGotAnyRequestedData = !!(
        (showRealizations && vectorQuery.data) ||
        (showStatistics && statisticsQuery.data) ||
        (showHistorical && historicalQuery.data)
    );

    let plotTitle = "N/A";
    if (vectorSpec && hasGotAnyRequestedData) {
        const unitString = determineUnitString(vectorQuery.data, statisticsQuery.data, historicalQuery.data);
        plotTitle = `${vectorSpec.vectorName} [${unitString}]`;
    }

    React.useEffect(
        function updateInstanceTitle() {
            if (ensemble && vectorSpec && hasGotAnyRequestedData) {
                const ensembleDisplayName = ensemble.getDisplayName();
                moduleContext.setInstanceTitle(`${ensembleDisplayName} - ${vectorSpec.vectorName}`);
            }
        },
        [hasGotAnyRequestedData, ensemble, vectorSpec, moduleContext]
    );

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: plotTitle,
        margin: { t: 30, r: 0, l: 40, b: 40 },
        xaxis: { type: "date" },
    };

    if (subscribedHoverTimestamp) {
        layout["shapes"] = [
            {
                type: "line",
                xref: "x",
                yref: "paper",
                x0: subscribedHoverTimestamp.timestampUtcMs,
                y0: 0,
                x1: subscribedHoverTimestamp.timestampUtcMs,
                y1: 1,
                line: { color: "red", width: 1, dash: "dot" },
            },
        ];
    }

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                data={tracesDataArr}
                layout={layout}
                config={{ scrollZoom: true }}
                onHover={handleHover}
                onUnhover={handleUnHover}
            />
        </div>
    );
};

function determineUnitString(
    realizationDataArr: VectorRealizationData_api[] | undefined,
    statisticData: VectorStatisticData_api | undefined,
    historicalData: VectorHistoricalData_api | undefined
): string {
    if (statisticData) {
        return statisticData.unit;
    }

    if (historicalData) {
        return historicalData.unit;
    }

    if (realizationDataArr && realizationDataArr.length > 0) {
        return realizationDataArr[0].unit;
    }

    return "";
}
