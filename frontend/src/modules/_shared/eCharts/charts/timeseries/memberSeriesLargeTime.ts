import type { CustomSeriesOption } from "echarts/charts";
import type { CustomSeriesRenderItemAPI, CustomSeriesRenderItemParams } from "echarts/types/dist/shared";

import type { SeriesBuildResult } from "../../core/composeChartOption";
import { makeSeriesId } from "../../core/seriesId";
import type { TimeseriesTrace } from "../../types";

import { TIMESERIES_CATEGORY } from "./ids";
import { mapLineShapeToStep } from "./lineShape";

/**
 * Time-axis variant of buildMemberSeriesLarge. Renders all members as polylines
 * in a single custom series using actual timestamp values on a `type: "time"` x-axis.
 *
 * The key difference from the category version: x-pixel positions cannot be derived
 * from a simple linear index transform. Instead, they are computed via `api.coord`
 * once per coordSys state and cached across all members in the same render cycle,
 * keeping cost at O(numTimesteps) api.coord calls per layout change rather than
 * O(numMembers × numTimesteps).
 */
export function buildMemberSeriesLargeTime(trace: TimeseriesTrace, axisIndex = 0): SeriesBuildResult {
    if (!trace.memberValues || trace.memberValues.length === 0) {
        return { series: [], legendData: [] };
    }

    const { memberValues, timestamps } = trace;
    const numTimesteps = timestamps.length;
    const numMembers = memberValues.length;

    // One data row per member: [memberIndex, yMin, yMax] for axis extent computation.
    const data: number[][] = [];
    for (let r = 0; r < numMembers; r++) {
        const vals = memberValues[r];
        let min = Infinity;
        let max = -Infinity;
        for (let t = 0; t < numTimesteps; t++) {
            const v = vals[t];
            if (v < min) min = v;
            if (v > max) max = v;
        }
        data.push([r, min, max]);
    }

    const series: CustomSeriesOption = {
        id: makeSeriesId({
            chartType: TIMESERIES_CATEGORY,
            role: "member-large",
            name: trace.highlightGroupKey ?? trace.name,
            subKey: "all",
            axisIndex,
        }),
        name: trace.name,
        type: "custom",
        data,
        xAxisIndex: axisIndex,
        yAxisIndex: axisIndex,
        encode: { y: [1, 2] },
        renderItem: createRenderItem(
            memberValues,
            timestamps,
            numTimesteps,
            trace.color,
            mapLineShapeToStep(trace.lineShape),
            trace.memberColors,
        ),
        itemStyle: { color: trace.color },
        progressive: 200,
        clip: true,
        silent: true,
        animation: false,
        tooltip: { show: false },
        z: 0,
    };

    return { series: [series], legendData: [trace.name] };
}

type PixelCache = {
    key: string;
    xPixels: number[];
    oy: number;
    pxPerVal: number;
};

function createRenderItem(
    memberValues: number[][],
    timestamps: number[],
    numTimesteps: number,
    defaultColor: string,
    step: "start" | "end" | null,
    memberColors?: string[],
): CustomSeriesOption["renderItem"] {
    let pixelCache: PixelCache | null = null;

    return function renderMemberPolyline(
        params: CustomSeriesRenderItemParams,
        api: CustomSeriesRenderItemAPI,
    ) {
        const memberIndex = api.value(0) as number;
        const values = memberValues[memberIndex];
        if (!values || numTimesteps === 0) return undefined;

        const coordSys = params.coordSys as unknown as { x: number; y: number; width: number; height: number } | undefined;
        const cacheKey = coordSys ? `${coordSys.x},${coordSys.y},${coordSys.width},${coordSys.height}` : "";

        // Compute x-pixel positions once per coordSys state, reused across all members.
        if (!pixelCache || pixelCache.key !== cacheKey) {
            const xPixels: number[] = new Array(numTimesteps);
            for (let t = 0; t < numTimesteps; t++) {
                xPixels[t] = api.coord([timestamps[t], 0])[0];
            }
            // Y axis is a linear value axis — derive transform from two reference points.
            const p0 = api.coord([timestamps[0], 0]);
            const p1 = api.coord([timestamps[0], 1]);
            pixelCache = { key: cacheKey, xPixels, oy: p0[1], pxPerVal: p1[1] - p0[1] };
        }

        const { xPixels, oy, pxPerVal } = pixelCache;

        // Binary-search visible timestep range to skip off-screen points.
        let tStart = 0;
        let tEnd = numTimesteps;
        if (coordSys) {
            tStart = Math.max(0, lowerBound(xPixels, coordSys.x) - 1);
            tEnd = Math.min(numTimesteps, upperBound(xPixels, coordSys.x + coordSys.width) + 1);
        }

        const points: number[][] = [];
        let prevX = 0;
        let prevY = 0;
        let havePrev = false;

        for (let t = tStart; t < tEnd; t++) {
            const val = values[t];
            if (!Number.isFinite(val)) {
                havePrev = false;
                continue;
            }
            const x = xPixels[t];
            const y = oy + val * pxPerVal;
            if (havePrev && step !== null) {
                if (step === "end") {
                    points.push([x, prevY]);
                } else {
                    points.push([prevX, y]);
                }
            }
            points.push([x, y]);
            prevX = x;
            prevY = y;
            havePrev = true;
        }

        if (points.length < 2) return undefined;

        const color = memberColors?.[memberIndex] ?? defaultColor;
        return {
            type: "polyline",
            shape: { points },
            style: { stroke: color, lineWidth: 0.8, opacity: 0.4, fill: "none" },
        };
    };
}

/** Index of the first element >= value in a sorted ascending array. */
function lowerBound(arr: number[], value: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < value) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/** Index one past the last element <= value in a sorted ascending array. */
function upperBound(arr: number[], value: number): number {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] <= value) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
