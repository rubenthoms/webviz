export type TimelineEvent = {
    id: string;
    timestamp: Date;
    label: string;
};

export type TimeViewport = {
    start: Date;
    end: Date;
};

export type EventCluster = {
    events: TimelineEvent[];
    centerTimestamp: Date;
    isCluster: boolean;
};

export type NeighbourhoodOptions = {
    /** Minimum number of events to include on each side of the focus event, if available. @default 2 */
    minEventsEachSide: number;
    /** A candidate gap is "similar" (expansion continues) if it's <= this multiplier times the average gap already inside the window. @default 3 */
    gapSimilarityMultiplier: number;
    /** Padding added on each side, as a fraction of the neighbourhood span (also capped at half the boundary gap). @default 0.15 */
    paddingFraction: number;
    /** Floor for the computed viewport duration, in milliseconds. @default 3_600_000 (1 hour) */
    minViewportDurationMs: number;
    /** Ceiling for the computed viewport duration, in milliseconds. Defaults to the full selectable range span. */
    maxViewportDurationMs?: number;
};

export type SelectedEventChangeReason = "overview-click" | "detail-click" | "prev-next-nav" | "scrub" | "programmatic";

export type ViewportChangeReason =
    | "auto-zoom"
    | "drag-pan"
    | "wheel-zoom"
    | "pinch-zoom"
    | "edge-resize"
    | "overview-click-focus"
    | "programmatic";

export type SelectedEventChangeDetails = {
    reason: SelectedEventChangeReason;
};

export type ViewportChangeDetails = {
    reason: ViewportChangeReason;
};
