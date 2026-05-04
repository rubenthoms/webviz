import type { EChartsOption } from "echarts";

import { buildCartesianSubplotChart } from "../../core/cartesianSubplotChart";
import type { CartesianSubplotBuildResult } from "../../core/cartesianSubplotChart";
import type { ComposeChartConfig } from "../../core/composeChartOption";
import type {
    BaseChartOptions,
    SubplotGroup,
    TimeseriesDisplayConfig,
    TimeseriesSubplotOverlays,
    TimeseriesTrace,
} from "../../types";

import { shouldUseLargeMemberSeries } from "./builder";
import { buildTimeseriesTimeSubplotArtifacts } from "./subplotArtifacts";
import { buildTimeseriesTooltip } from "./tooltips";
import { resampleSubplotGroupsForZoom } from "../../utils/resampleTimeseries";

export type TimeseriesTimeChartOptions = BaseChartOptions & {
    subplotOverlays: TimeseriesSubplotOverlays[];
    displayConfig: TimeseriesDisplayConfig;
    yAxisLabel?: string;
    memberLabel?: string;
};

type RealtimeAxisPointer = {
    show: true;
    type: "line";
    triggerTooltip: false;
    label: { show: true };
};

/** Builds a timeseries chart using a `type: "time"` x-axis instead of category. */
export function buildTimeseriesTimeChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    options: TimeseriesTimeChartOptions,
): EChartsOption {
    const { subplotOverlays, displayConfig, memberLabel } = options;
    const yAxisLabel = options.yAxisLabel ?? "Value";

    if (subplotOverlays.length !== subplotGroups.length) {
        throw new Error("Timeseries subplot overlays must match the number of subplot groups.");
    }

    const nonEmptyGroupedData = subplotGroups
        .map((group, index) => ({ group, overlays: subplotOverlays[index] }))
        .filter((entry) => entry.group.traces.length > 0);

    const nonEmptySubplotGroups = nonEmptyGroupedData.map((entry) => entry.group);
    const nonEmptySubplotOverlays = nonEmptyGroupedData.map((entry) => entry.overlays);

    // Resample traces to the visible window before building the chart. When a
    // zoom state is present the data is filtered to [start%, end%] of the full
    // x-range and LTTB-resampled to at most `resampleTargetCount` points. This
    // keeps the visual shape intact at every zoom level while bounding the
    // number of points ECharts must render. We then reset the ECharts dataZoom
    // to [0, 100] because the returned data already represents the visible window.
    const hasXZoom = options.zoomState?.x != null;
    const resampledSubplotGroups = resampleSubplotGroupsForZoom(
        nonEmptySubplotGroups,
        options.zoomState,
        displayConfig.resampleTargetCount,
    );

    const axisTimestamps = getAxisTimestamps(resampledSubplotGroups);
    if (axisTimestamps.length === 0) return {};

    const useLargeMemberSeries = shouldUseLargeMemberSeries(resampledSubplotGroups, displayConfig);
    const realtimePointer = buildRealtimeAxisPointer(displayConfig);
    const numSubplots = resampledSubplotGroups.length;
    const enableZoom = options.zoomable === true || options.zoomState != null;

    const buildSubplot = function buildTimeseriesTimeSubplotForAxis(
        group: SubplotGroup<TimeseriesTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        const subplotArtifacts = buildTimeseriesTimeSubplotArtifacts(
            group,
            nonEmptySubplotOverlays[axisIndex],
            axisIndex,
            displayConfig,
            useLargeMemberSeries,
        );

        return {
            series: subplotArtifacts.series,
            legendData: subplotArtifacts.legendData,
            xAxis: {
                type: "time",
                min: axisTimestamps[0],
                max: axisTimestamps[axisTimestamps.length - 1],
                boundaryGap: false,
                axisPointer: realtimePointer,
            },
            yAxis: {
                type: "value",
                label: yAxisLabel,
                scale: true,
                splitLine: false,
                axisPointer: realtimePointer,
            },
            title: group.title,
        };
    };

    return buildCartesianSubplotChart(resampledSubplotGroups, buildSubplot, {
        ...options,
        ...buildTimeseriesTimeComposeOverrides(numSubplots, displayConfig, memberLabel, enableZoom),
    });
}

function getAxisTimestamps(subplotGroups: SubplotGroup<TimeseriesTrace>[]): number[] {
    const firstTrace = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
    return firstTrace ? firstTrace.timestamps : [];
}

function buildRealtimeAxisPointer(config: TimeseriesDisplayConfig): RealtimeAxisPointer | undefined {
    const showCrosshair = config.showMembers && !config.showStatistics;
    return showCrosshair
        ? undefined
        : { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } };
}

function buildTimeseriesTimeComposeOverrides(
    numSubplots: number,
    config: TimeseriesDisplayConfig,
    memberLabel?: string,
    enableZoom = false,
) {
    const toolboxFeature = enableZoom
        ? {
              dataZoom: { yAxisIndex: "none" as const, title: { zoom: "Box zoom", back: "Reset zoom" } },
              restore: { title: "Reset" },
          }
        : { restore: { title: "Reset" } };

    return {
        tooltip: buildTimeseriesTooltip(config, { memberLabel }),
        axisPointer: {
            show: true,
            type: "line" as const,
            triggerEmphasis: false,
            triggerTooltip: false,
            label: { show: true },
            link: [{ xAxisIndex: "all" as const }],
        },
        toolbox: { feature: toolboxFeature, right: 16, top: 4 },
        ...(enableZoom ? { dataZoom: buildTimeseriesTimeDataZoom(numSubplots) } : {}),
    };
}

function buildTimeseriesTimeDataZoom(numSubplots: number): NonNullable<ComposeChartConfig["dataZoom"]> {
    const allAxisIndices = Array.from({ length: numSubplots }, (_, i) => i);
    return [
        { type: "inside" as const, id: "x", xAxisIndex: allAxisIndices, filterMode: "none" as const },
        { type: "inside" as const, id: "y", yAxisIndex: allAxisIndices, filterMode: "none" as const },
    ];
}
