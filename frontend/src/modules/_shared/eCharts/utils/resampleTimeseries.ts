import type { ChartZoomState } from "../core/composeChartOption";
import type { SubplotGroup, TimeseriesStatistics, TimeseriesTrace } from "../types";

const DEFAULT_TARGET_SAMPLE_COUNT = 500000000000;

/**
 * Resamples subplot groups to keep roughly `targetSampleCount` data points visible
 * at any zoom level, using LTTB for shape-preserving downsampling.
 *
 * When `zoomState.x` is set, only the visible timestamp range is returned and the
 * caller should reset the ECharts x-dataZoom to [0, 100] (since the data already
 * represents the visible window). Y-zoom is not affected.
 */
export function resampleSubplotGroupsForZoom(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    zoomState: ChartZoomState | null | undefined,
    targetSampleCount: number = DEFAULT_TARGET_SAMPLE_COUNT,
): SubplotGroup<TimeseriesTrace>[] {
    console.debug("Resampling subplot groups for zoom", { zoomState, targetSampleCount });
    const sharedTimestamps = getSharedTimestamps(subplotGroups);
    if (!sharedTimestamps) return subplotGroups;

    const n = sharedTimestamps.length;

    let startIdx = 0;
    let endIdx = n - 1;

    if (zoomState?.x) {
        const { start, end } = zoomState.x;
        startIdx = Math.max(0, Math.floor((start / 100) * n));
        endIdx = Math.min(n - 1, Math.ceil((end / 100) * n) - 1);
        if (endIdx < startIdx) endIdx = startIdx;
    }

    const visibleCount = endIdx - startIdx + 1;
    if (visibleCount <= targetSampleCount) {
        // All visible points fit within the budget — filter to range only.
        if (startIdx === 0 && endIdx === n - 1) return subplotGroups;
        const indices = Array.from({ length: visibleCount }, (_, i) => startIdx + i);
        return applyIndexSelection(subplotGroups, indices);
    }

    const signal = buildRepresentativeSignal(subplotGroups, startIdx, endIdx);
    const relativeIndices = lttbIndices(signal, targetSampleCount);
    const absoluteIndices = relativeIndices.map((i) => startIdx + i);
    return applyIndexSelection(subplotGroups, absoluteIndices);
}

/**
 * Largest-Triangle-Three-Buckets downsampling.
 *
 * Returns `targetCount` indices from `values` that maximize the sum of triangle
 * areas between consecutive selected points, preserving the visual shape of the
 * line. Always includes index 0 and the last index. NaN values are treated as 0.
 */
export function lttbIndices(values: ArrayLike<number>, targetCount: number): number[] {
    const n = values.length;
    if (n <= targetCount) return Array.from({ length: n }, (_, i) => i);
    if (targetCount <= 2) return targetCount === 1 ? [0] : [0, n - 1];

    const result: number[] = [0];
    const every = (n - 2) / (targetCount - 2);
    let prevIdx = 0;

    for (let i = 0; i < targetCount - 2; i++) {
        // Next-bucket centroid (look-ahead point for triangle area calculation).
        const nextStart = Math.floor((i + 1) * every) + 1;
        const nextEnd = Math.min(Math.floor((i + 2) * every) + 1, n);
        const nextLen = nextEnd - nextStart;

        let avgX = 0;
        let avgY = 0;
        for (let j = nextStart; j < nextEnd; j++) {
            avgX += j;
            const v = values[j];
            avgY += Number.isFinite(v) ? (v as number) : 0;
        }
        avgX /= nextLen;
        avgY /= nextLen;

        // Current bucket: pick the point that forms the largest triangle with prev and centroid.
        const currStart = Math.floor(i * every) + 1;
        const currEnd = nextStart;

        const prevX = prevIdx;
        const prevY = Number.isFinite(values[prevIdx]) ? (values[prevIdx] as number) : 0;

        let maxArea = -1;
        let maxIdx = currStart;

        for (let j = currStart; j < currEnd; j++) {
            const yj = Number.isFinite(values[j]) ? (values[j] as number) : 0;
            // Triangle area (without the ½ factor — we only need relative ordering).
            const area = Math.abs((prevX - avgX) * (yj - prevY) - (prevX - j) * (avgY - prevY));
            if (area > maxArea) {
                maxArea = area;
                maxIdx = j;
            }
        }

        result.push(maxIdx);
        prevIdx = maxIdx;
    }

    result.push(n - 1);
    return result;
}

// --- internals ---

function getSharedTimestamps(subplotGroups: SubplotGroup<TimeseriesTrace>[]): number[] | null {
    const first = subplotGroups.flatMap((g) => g.traces).find((t) => t.timestamps.length > 0);
    return first ? first.timestamps : null;
}

/**
 * Builds a single representative signal over [startIdx, endIdx] for LTTB index selection.
 *
 * Priority: statistics.mean → mean across members → linear ramp (uniform fallback).
 * The linear ramp produces the same output as strided sampling.
 */
function buildRepresentativeSignal(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    startIdx: number,
    endIdx: number,
): Float64Array {
    const len = endIdx - startIdx + 1;

    for (const group of subplotGroups) {
        for (const trace of group.traces) {
            if (trace.statistics?.mean) {
                const mean = trace.statistics.mean;
                const signal = new Float64Array(len);
                for (let i = 0; i < len; i++) {
                    const v = mean[startIdx + i];
                    signal[i] = Number.isFinite(v) ? v : 0;
                }
                return signal;
            }

            if (trace.memberValues && trace.memberValues.length > 0) {
                const signal = new Float64Array(len);
                const memberCount = trace.memberValues.length;
                for (let i = 0; i < len; i++) {
                    let sum = 0;
                    let count = 0;
                    for (let m = 0; m < memberCount; m++) {
                        const v = trace.memberValues[m][startIdx + i];
                        if (Number.isFinite(v)) {
                            sum += v;
                            count++;
                        }
                    }
                    signal[i] = count > 0 ? sum / count : 0;
                }
                return signal;
            }
        }
    }

    // Fallback: linear ramp — LTTB on a straight line picks uniformly spaced points.
    const signal = new Float64Array(len);
    for (let i = 0; i < len; i++) signal[i] = i;
    return signal;
}

function applyIndexSelection(
    subplotGroups: SubplotGroup<TimeseriesTrace>[],
    indices: number[],
): SubplotGroup<TimeseriesTrace>[] {
    return subplotGroups.map((group) => ({
        ...group,
        traces: group.traces.map((trace) => resampleTrace(trace, indices)),
    }));
}

function resampleTrace(trace: TimeseriesTrace, indices: number[]): TimeseriesTrace {
    const resampled: TimeseriesTrace = {
        ...trace,
        timestamps: indices.map((i) => trace.timestamps[i]),
    };

    if (trace.memberValues) {
        resampled.memberValues = trace.memberValues.map((memberVals) => indices.map((i) => memberVals[i]));
    }

    if (trace.statistics) {
        const resampledStats: Record<string, number[]> = {};
        for (const [key, vals] of Object.entries(trace.statistics)) {
            resampledStats[key] = indices.map((i) => vals[i]);
        }
        resampled.statistics = resampledStats as TimeseriesStatistics;
    }

    return resampled;
}
