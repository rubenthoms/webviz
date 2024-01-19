import React from "react";
import Plot from "react-plotly.js";

import { VectorHistoricalData_api, VectorRealizationData_api, VectorStatisticData_api } from "@api";
import { ModuleFCProps } from "@framework/Module";
import { useBusinessLogic } from "@framework/ModuleBusinessLogic";
import { useViewStatusWriter } from "@framework/StatusWriter";
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

export const View = ({ businessLogic, moduleContext }: ModuleFCProps<State, BusinessLogic>) => {
    const state = useBusinessLogic(businessLogic);

    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const statusWriter = useViewStatusWriter(moduleContext);

    statusWriter.setLoading(state.loadingStates.vectorData);

    // const subscribedHoverTimestamp = useSubscribedValue("global.hoverTimestamp", workbenchServices);
    // const subscribedHoverRealization = useSubscribedValue("global.hoverRealization", workbenchServices);

    /*
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
    */

    const tracesDataArr: MyPlotData[] = [];

    if (
        state.userSelections.showRealizations &&
        state.fetchedData.vectorData &&
        state.fetchedData.vectorData.length > 0
    ) {
        for (let i = 0; i < state.fetchedData.vectorData.length; i++) {
            const vec = state.fetchedData.vectorData[i];
            /*
            const isHighlighted = vec.realization === subscribedHoverRealization?.realization ? true : false;
            const curveColor = vec.realization === subscribedHoverRealization?.realization ? "red" : "green";
            const lineWidth = vec.realization === subscribedHoverRealization?.realization ? 3 : 1;
            */
            const trace: MyPlotData = {
                x: vec.timestamps_utc_ms,
                y: vec.values,
                name: `real-${vec.realization}`,
                realizationNumber: vec.realization,
                legendrank: vec.realization,
                type: "scatter",
                mode: "lines",
            };

            tracesDataArr.push(trace);
        }
    }

    let plotTitle = "N/A";
    if (state.userSelections.vector && state.fetchedData.vectorData) {
        const unitString = determineUnitString(state.fetchedData.vectorData, undefined, undefined);
        plotTitle = `${state.userSelections.vector} [${unitString}]`;
    }

    /*
    const hasGotAnyRequestedData = !!(
        (showRealizations && vectorQuery.data) ||
        (showStatistics && statisticsQuery.data) ||
        (showHistorical && historicalQuery.data)
    );

    React.useEffect(
        function updateInstanceTitle() {
            if (ensemble && vectorSpec && hasGotAnyRequestedData) {
                const ensembleDisplayName = ensemble.getDisplayName();
                moduleContext.setInstanceTitle(`${ensembleDisplayName} - ${vectorSpec.vectorName}`);
            }
        },
        [hasGotAnyRequestedData, ensemble, vectorSpec, moduleContext]
    );
    */

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: plotTitle,
        margin: { t: 30, r: 0, l: 40, b: 40 },
        xaxis: { type: "date" },
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            <Plot
                data={tracesDataArr}
                layout={layout}
                config={{ scrollZoom: true }}
                // onHover={handleHover}
                // onUnhover={handleUnHover}
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
