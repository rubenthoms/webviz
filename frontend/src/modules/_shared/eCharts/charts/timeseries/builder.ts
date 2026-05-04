import type { EChartsOption } from "echarts";

import { timestampUtcMsToCompactIsoString } from "@framework/utils/timestampUtils";

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

import { resampleSubplotGroupsForZoom } from "../../utils/resampleTimeseries";

import { buildTimeseriesSubplotArtifacts } from "./subplotArtifacts";
import { buildTimeseriesTooltip } from "./tooltips";

export type TimeseriesChartOptions = BaseChartOptions & {
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

/** Builds a timeseries chart with members, statistics, fanchart, and reference lines. */
export function buildTimeseriesChart(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    options: TimeseriesChartOptions,
): EChartsOption {
    const { subplotOverlays, displayConfig, memberLabel } = options;
    const yAxisLabel = options.yAxisLabel ?? "Value";

    if (subplotOverlays.length !== subplotGroups.length) {
        throw new Error("Timeseries subplot overlays must match the number of subplot groups.");
    }

    const groupedData = subplotGroups.map(function pairGroupWithOverlays(group, index) {
        return {
            group,
            overlays: subplotOverlays[index],
        };
    });

    const nonEmptyGroupedData = groupedData.filter((entry) => entry.group.traces.length > 0);
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

    const categoryData = buildCategoryData(resampledSubplotGroups);
    if (categoryData.length === 0) return {};

    const useLargeMemberSeries = shouldUseLargeMemberSeries(resampledSubplotGroups, displayConfig);
    const realtimePointer = buildRealtimeAxisPointer(displayConfig);
    const numSubplots = resampledSubplotGroups.length;
    const enableZoom = options.zoomable === true || options.zoomState != null;

    const buildSubplot = function buildTimeseriesSubplotForAxis(
        group: SubplotGroup<TimeseriesTrace>,
        axisIndex: number,
    ): CartesianSubplotBuildResult {
        return buildTimeseriesSubplot(
            group,
            nonEmptySubplotOverlays[axisIndex],
            axisIndex,
            displayConfig,
            categoryData,
            yAxisLabel,
            realtimePointer,
            false, //useLargeMemberSeries,
        );
    };

    // When the x-zoom has been consumed into the data, pass an empty zoom state
    // so ECharts renders 0-100 % of the already-filtered category axis. The y-zoom
    // (if any) is forwarded unchanged so the y-axis viewport is preserved.
    const effectiveZoomState = hasXZoom ? { y: options.zoomState?.y } : options.zoomState;

    return buildCartesianSubplotChart(resampledSubplotGroups, buildSubplot, {
        ...options,
        zoomState: effectiveZoomState,
        ...buildTimeseriesComposeOverrides(numSubplots, displayConfig, memberLabel, enableZoom),
    });
}

function buildCategoryData(subplotGroups: SubplotGroup<TimeseriesTrace>[]): string[] {
    const firstTrace = subplotGroups.flatMap((group) => group.traces).find((trace) => trace.timestamps.length > 0);
    return firstTrace ? firstTrace.timestamps.map((timestamp) => timestampUtcMsToCompactIsoString(timestamp)) : [];
}

const DEFAULT_LARGE_MEMBER_POINT_BUDGET = 100_000;

/**
 * Decides whether the chart should use the fast custom-polyline renderer for
 * all member series. The decision is chart-wide: either all traces use large
 * mode or none do, so the interaction model stays consistent.
 */
export function shouldUseLargeMemberSeries(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    config: TimeseriesDisplayConfig,
): boolean {
    if (!config.showMembers) return false;

    const budget = config.largeMemberPointBudget ?? DEFAULT_LARGE_MEMBER_POINT_BUDGET;
    let totalMemberPoints = 0;

    for (const group of subplotGroups) {
        for (const trace of group.traces) {
            if (trace.memberValues) {
                totalMemberPoints += trace.memberValues.length * trace.timestamps.length;
            }
        }
    }

    return totalMemberPoints > budget;
}

function buildRealtimeAxisPointer(config: TimeseriesDisplayConfig): RealtimeAxisPointer | undefined {
    const showCrosshair = config.showMembers && !config.showStatistics;
    return showCrosshair
        ? undefined
        : { show: true, type: "line" as const, triggerTooltip: false, label: { show: true } };
}

function buildTimeseriesSubplot(
    group: SubplotGroup<TimeseriesTrace>,
    subplotOverlays: TimeseriesSubplotOverlays,
    axisIndex: number,
    config: TimeseriesDisplayConfig,
    categoryData: string[],
    yAxisLabel: string,
    realtimePointer: RealtimeAxisPointer | undefined,
    useLargeMemberSeries: boolean,
): CartesianSubplotBuildResult {
    // The subplot artifact builder owns the emitted series order so visual rendering
    // and interaction index generation stay coupled through a single path.
    const subplotArtifacts = buildTimeseriesSubplotArtifacts(
        group,
        subplotOverlays,
        axisIndex,
        config,
        useLargeMemberSeries,
    );

    return {
        series: subplotArtifacts.series,
        legendData: subplotArtifacts.legendData,
        xAxis: { type: "category", data: categoryData, boundaryGap: false, axisPointer: realtimePointer },
        yAxis: { type: "value", label: yAxisLabel, scale: true, splitLine: false, axisPointer: realtimePointer },
        title: group.title,
    };
}

function buildTimeseriesComposeOverrides(
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
        : {
              restore: { title: "Reset" },
          };

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
        toolbox: {
            feature: toolboxFeature,
            right: 16,
            top: 4,
        },
        ...(enableZoom ? { dataZoom: buildTimeseriesDataZoom(numSubplots) } : {}),
    };
}

function buildTimeseriesDataZoom(numSubplots: number): NonNullable<ComposeChartConfig["dataZoom"]> {
    const allAxisIndices = Array.from({ length: numSubplots }, (_, index) => index);

    return [
        { type: "inside" as const, id: "x", xAxisIndex: allAxisIndices, filterMode: "none" as const },
        { type: "inside" as const, id: "y", yAxisIndex: allAxisIndices, filterMode: "none" as const },
    ];
}
