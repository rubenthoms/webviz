import { clamp } from "lodash";

import {
    DEFAULT_NEIGHBOURHOOD_OPTIONS,
    NICE_TICK_STEPS_MS,
    VIEWPORT_SAFE_ZONE_END_FRACTION,
    VIEWPORT_SAFE_ZONE_START_FRACTION,
} from "./_constants";
import type {
    EventCluster,
    NeighbourhoodOptions,
    SelectedEventChangeReason,
    TimeViewport,
    TimelineEvent,
    ViewportChangeReason,
} from "./types";

export function sortEventsByTimestamp(events: TimelineEvent[]): TimelineEvent[] {
    return [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function timeToPixel(time: Date, range: TimeViewport, pixelWidth: number): number {
    const durationMs = range.end.getTime() - range.start.getTime();
    if (durationMs <= 0) return 0;
    return ((time.getTime() - range.start.getTime()) / durationMs) * pixelWidth;
}

export function pixelToTime(pixel: number, range: TimeViewport, pixelWidth: number): Date {
    if (pixelWidth <= 0) return new Date(range.start.getTime());
    const durationMs = range.end.getTime() - range.start.getTime();
    return new Date(range.start.getTime() + (pixel / pixelWidth) * durationMs);
}

export function pixelDeltaToMs(deltaPx: number, range: TimeViewport, pixelWidth: number): number {
    if (pixelWidth <= 0) return 0;
    const durationMs = range.end.getTime() - range.start.getTime();
    return (deltaPx / pixelWidth) * durationMs;
}

export function viewportsEqual(a: TimeViewport, b: TimeViewport): boolean {
    return a.start.getTime() === b.start.getTime() && a.end.getTime() === b.end.getTime();
}

export function isEventInViewport(event: TimelineEvent, viewport: TimeViewport): boolean {
    const t = event.timestamp.getTime();
    return t >= viewport.start.getTime() && t <= viewport.end.getTime();
}

/** Finds the event whose timestamp is closest to `time`. Assumes `sortedEvents` is sorted ascending. */
export function findNearestEvent(sortedEvents: TimelineEvent[], time: Date): TimelineEvent | null {
    if (sortedEvents.length === 0) return null;

    const targetMs = time.getTime();
    let lo = 0;
    let hi = sortedEvents.length - 1;

    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (sortedEvents[mid].timestamp.getTime() < targetMs) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    const candidates = [sortedEvents[lo - 1], sortedEvents[lo], sortedEvents[lo + 1]].filter(
        (e): e is TimelineEvent => e !== undefined,
    );

    return candidates.reduce((closest, candidate) => {
        const closestDiff = Math.abs(closest.timestamp.getTime() - targetMs);
        const candidateDiff = Math.abs(candidate.timestamp.getTime() - targetMs);
        return candidateDiff < closestDiff ? candidate : closest;
    });
}

/** Finds the previous/next event relative to `currentId`. If `currentId` is null, both directions start at the first event. */
export function findAdjacentEvent(
    sortedEvents: TimelineEvent[],
    currentId: string | null,
    direction: "prev" | "next",
): TimelineEvent | null {
    if (sortedEvents.length === 0) return null;

    if (currentId === null) return sortedEvents[0];

    const currentIndex = sortedEvents.findIndex((e) => e.id === currentId);
    if (currentIndex === -1) return sortedEvents[0];

    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex < 0 || targetIndex >= sortedEvents.length) return null;

    return sortedEvents[targetIndex];
}

export function clampViewportToRange(viewport: TimeViewport, fullRange: TimeViewport): TimeViewport {
    const fullDurationMs = fullRange.end.getTime() - fullRange.start.getTime();
    const durationMs = Math.min(viewport.end.getTime() - viewport.start.getTime(), fullDurationMs);

    let startMs = viewport.start.getTime();
    let endMs = startMs + durationMs;

    if (startMs < fullRange.start.getTime()) {
        startMs = fullRange.start.getTime();
        endMs = startMs + durationMs;
    }
    if (endMs > fullRange.end.getTime()) {
        endMs = fullRange.end.getTime();
        startMs = endMs - durationMs;
    }

    return { start: new Date(startMs), end: new Date(endMs) };
}

/**
 * Computes a viewport that frames the "local neighbourhood" of `focusEventId`: it expands outward
 * from the focus event on each side while adjacent gaps stay similar in size to the local average,
 * stopping independently on each side once it hits a gap boundary (a gap that's much bigger than
 * its neighbours) - see the component's design notes for the full rationale.
 */
export function computeNeighbourhoodViewport(
    sortedEvents: TimelineEvent[],
    focusEventId: string,
    fullRange: TimeViewport,
    options: NeighbourhoodOptions = DEFAULT_NEIGHBOURHOOD_OPTIONS,
): TimeViewport {
    const focusIndex = sortedEvents.findIndex((e) => e.id === focusEventId);
    if (focusIndex === -1) return fullRange;

    let loIdx = Math.max(0, focusIndex - options.minEventsEachSide);
    let hiIdx = Math.min(sortedEvents.length - 1, focusIndex + options.minEventsEachSide);

    // Gaps (ms) already inside the window, used to compute the local average that governs further
    // expansion. Averaged over the whole window (not just the seed's own initial gaps), so a single
    // early large gap can't permanently dominate a slice-based "most recent N" that (incorrectly)
    // treated array position as a proxy for distance from the focus event.
    const gapsInWindow: number[] = [];
    for (let i = loIdx; i < hiIdx; i++) {
        gapsInWindow.push(sortedEvents[i + 1].timestamp.getTime() - sortedEvents[i].timestamp.getTime());
    }

    let closedLeft = loIdx === 0;
    let closedRight = hiIdx === sortedEvents.length - 1;

    function localAverage(): number {
        if (gapsInWindow.length === 0) return 0;
        return gapsInWindow.reduce((sum, g) => sum + g, 0) / gapsInWindow.length;
    }

    while (!closedLeft || !closedRight) {
        const leftGap = closedLeft
            ? Infinity
            : sortedEvents[loIdx].timestamp.getTime() - sortedEvents[loIdx - 1].timestamp.getTime();
        const rightGap = closedRight
            ? Infinity
            : sortedEvents[hiIdx + 1].timestamp.getTime() - sortedEvents[hiIdx].timestamp.getTime();

        const expandLeft = leftGap <= rightGap;
        const candidateGap = expandLeft ? leftGap : rightGap;

        const avg = localAverage();
        const isSimilar = gapsInWindow.length === 0 || candidateGap <= avg * options.gapSimilarityMultiplier;

        if (!isSimilar) {
            if (expandLeft) closedLeft = true;
            else closedRight = true;
            continue;
        }

        if (expandLeft) {
            loIdx -= 1;
            gapsInWindow.unshift(candidateGap);
            closedLeft = loIdx === 0;
        } else {
            hiIdx += 1;
            gapsInWindow.unshift(candidateGap);
            closedRight = hiIdx === sortedEvents.length - 1;
        }
    }

    const neighbourhoodStartMs = sortedEvents[loIdx].timestamp.getTime();
    const neighbourhoodEndMs = sortedEvents[hiIdx].timestamp.getTime();
    const span = neighbourhoodEndMs - neighbourhoodStartMs;

    const boundaryGapLeft =
        loIdx > 0 ? neighbourhoodStartMs - sortedEvents[loIdx - 1].timestamp.getTime() : span || options.minViewportDurationMs;
    const boundaryGapRight =
        hiIdx < sortedEvents.length - 1
            ? sortedEvents[hiIdx + 1].timestamp.getTime() - neighbourhoodEndMs
            : span || options.minViewportDurationMs;

    let paddingLeft: number;
    let paddingRight: number;
    if (span === 0) {
        paddingLeft = paddingRight = options.minViewportDurationMs / 2;
    } else {
        paddingLeft = Math.min(options.paddingFraction * span, 0.5 * boundaryGapLeft);
        paddingRight = Math.min(options.paddingFraction * span, 0.5 * boundaryGapRight);
    }

    let startMs = neighbourhoodStartMs - paddingLeft;
    let endMs = neighbourhoodEndMs + paddingRight;

    const maxDurationMs = options.maxViewportDurationMs ?? fullRange.end.getTime() - fullRange.start.getTime();
    const durationMs = clamp(endMs - startMs, options.minViewportDurationMs, maxDurationMs);
    if (durationMs !== endMs - startMs) {
        const centerMs = (startMs + endMs) / 2;
        startMs = centerMs - durationMs / 2;
        endMs = centerMs + durationMs / 2;
    }

    return clampViewportToRange({ start: new Date(startMs), end: new Date(endMs) }, fullRange);
}

/**
 * Groups consecutive events whose pixel distance (at the given range/pixelWidth) is below
 * `clusterPixelThresholdPx` into a single cluster. Assumes `events` is sorted ascending.
 */
export function clusterEvents(
    events: TimelineEvent[],
    range: TimeViewport,
    pixelWidth: number,
    clusterPixelThresholdPx: number,
): EventCluster[] {
    if (events.length === 0) return [];

    const durationMs = range.end.getTime() - range.start.getTime();
    const safePixelWidth = Math.max(pixelWidth, 1);
    const thresholdMs = clusterPixelThresholdPx * (durationMs / safePixelWidth);

    const clusters: EventCluster[] = [];
    let currentGroup: TimelineEvent[] = [events[0]];

    function finalizeGroup(group: TimelineEvent[]): EventCluster {
        const centerMs =
            group.reduce((sum, e) => sum + e.timestamp.getTime(), 0) / group.length;
        return { events: group, centerTimestamp: new Date(centerMs), isCluster: group.length > 1 };
    }

    for (let i = 1; i < events.length; i++) {
        const prev = currentGroup[currentGroup.length - 1];
        const curr = events[i];
        if (curr.timestamp.getTime() - prev.timestamp.getTime() <= thresholdMs) {
            currentGroup.push(curr);
        } else {
            clusters.push(finalizeGroup(currentGroup));
            currentGroup = [curr];
        }
    }
    clusters.push(finalizeGroup(currentGroup));

    return clusters;
}

/**
 * Frames a viewport around exactly one cluster's own members (first to last event, with padding),
 * rather than running the general neighbourhood-expansion algorithm. Used when the user explicitly
 * clicks a cluster marker: the intent is unambiguous ("show me what's in this group"), and the
 * expansion algorithm's mandatory "include >= minEventsEachSide neighbours" floor can otherwise
 * pull in far-away events and produce a viewport wide enough to re-cluster the very group being
 * opened - self-defeating for this specific interaction.
 */
export function computeClusterFitViewport(
    cluster: EventCluster,
    fullRange: TimeViewport,
    options: NeighbourhoodOptions = DEFAULT_NEIGHBOURHOOD_OPTIONS,
): TimeViewport {
    const timestamps = cluster.events.map((e) => e.timestamp.getTime());
    const startMs = Math.min(...timestamps);
    const endMs = Math.max(...timestamps);
    const span = endMs - startMs;

    const paddingMs = span === 0 ? options.minViewportDurationMs / 2 : options.paddingFraction * span;

    const maxDurationMs = options.maxViewportDurationMs ?? fullRange.end.getTime() - fullRange.start.getTime();
    const durationMs = clamp(span + 2 * paddingMs, options.minViewportDurationMs, maxDurationMs);
    const centerMs = (startMs + endMs) / 2;

    return clampViewportToRange(
        { start: new Date(centerMs - durationMs / 2), end: new Date(centerMs + durationMs / 2) },
        fullRange,
    );
}

function pickNiceTickStepMs(rawStepMs: number): number {
    return NICE_TICK_STEPS_MS.find((step) => step >= rawStepMs) ?? NICE_TICK_STEPS_MS[NICE_TICK_STEPS_MS.length - 1];
}

/**
 * Returns "nice" tick timestamps spanning `range`, spaced at least `minTickSpacingPx` apart. The
 * range's own start/end are always included (so the ribbon's extremes are always labeled), with
 * any "nice" tick too close to either edge dropped to avoid overlapping labels.
 */
export function getAxisTicks(range: TimeViewport, pixelWidth: number, minTickSpacingPx: number): Date[] {
    const durationMs = range.end.getTime() - range.start.getTime();
    if (durationMs <= 0 || pixelWidth <= 0) return [range.start];

    const maxTickCount = Math.max(2, Math.floor(pixelWidth / minTickSpacingPx));
    const stepMs = pickNiceTickStepMs(durationMs / maxTickCount);
    const edgeExclusionMs = (minTickSpacingPx / pixelWidth) * durationMs;

    const startMs = range.start.getTime();
    const endMs = range.end.getTime();

    const ticks: number[] = [startMs];
    const firstNiceTickMs = Math.ceil(startMs / stepMs) * stepMs;
    for (let ms = firstNiceTickMs; ms < endMs; ms += stepMs) {
        if (ms - startMs < edgeExclusionMs || endMs - ms < edgeExclusionMs) continue;
        ticks.push(ms);
    }
    ticks.push(endMs);

    return ticks.map((ms) => new Date(ms));
}

export function formatAxisTick(date: Date, viewportSpanMs: number): string {
    if (viewportSpanMs < 10 * 60 * 1000) {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
    if (viewportSpanMs < 2 * 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    }
    if (viewportSpanMs < 90 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    }
    return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/**
 * Decides whether/how the viewport should react to a newly selected event:
 * - Overview clicks always fully re-focus the neighbourhood (the ribbon's whole point is jumping
 *   to wherever was clicked).
 * - Detail clicks / prev-next nav / programmatic selection only pan minimally (keeping the current
 *   zoom level) if the event is already inside the viewport but outside a "safe" central zone;
 *   if it's fully outside the viewport, a full neighbourhood recompute kicks in as a fallback.
 * - If the event is already comfortably inside the safe zone, the viewport is left untouched
 *   (`null`) - this is what keeps selection and viewport decoupled.
 */
export function computeAutoZoomViewport(
    sortedEvents: TimelineEvent[],
    newSelectedEvent: TimelineEvent,
    currentViewport: TimeViewport,
    fullRange: TimeViewport,
    reason: SelectedEventChangeReason,
    neighbourhoodOptions: NeighbourhoodOptions,
): { viewport: TimeViewport; reason: ViewportChangeReason } | null {
    if (reason === "overview-click") {
        return {
            viewport: computeNeighbourhoodViewport(sortedEvents, newSelectedEvent.id, fullRange, neighbourhoodOptions),
            reason: "overview-click-focus",
        };
    }

    const durationMs = currentViewport.end.getTime() - currentViewport.start.getTime();
    if (durationMs <= 0) {
        return {
            viewport: computeNeighbourhoodViewport(sortedEvents, newSelectedEvent.id, fullRange, neighbourhoodOptions),
            reason: "auto-zoom",
        };
    }

    const fraction = (newSelectedEvent.timestamp.getTime() - currentViewport.start.getTime()) / durationMs;

    if (fraction >= VIEWPORT_SAFE_ZONE_START_FRACTION && fraction <= VIEWPORT_SAFE_ZONE_END_FRACTION) {
        return null;
    }

    if (fraction >= 0 && fraction <= 1) {
        const targetFraction = fraction < VIEWPORT_SAFE_ZONE_START_FRACTION ? VIEWPORT_SAFE_ZONE_START_FRACTION : VIEWPORT_SAFE_ZONE_END_FRACTION;
        const deltaMs = (fraction - targetFraction) * durationMs;
        const shifted: TimeViewport = {
            start: new Date(currentViewport.start.getTime() + deltaMs),
            end: new Date(currentViewport.end.getTime() + deltaMs),
        };
        return { viewport: clampViewportToRange(shifted, fullRange), reason: "auto-zoom" };
    }

    return {
        viewport: computeNeighbourhoodViewport(sortedEvents, newSelectedEvent.id, fullRange, neighbourhoodOptions),
        reason: "auto-zoom",
    };
}
