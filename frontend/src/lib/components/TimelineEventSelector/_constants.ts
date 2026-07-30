import type { NeighbourhoodOptions } from "./types";

export const DEFAULT_NEIGHBOURHOOD_OPTIONS: NeighbourhoodOptions = {
    minEventsEachSide: 2,
    gapSimilarityMultiplier: 3,
    paddingFraction: 0.15,
    minViewportDurationMs: 60 * 60 * 1000, // 1 hour
    maxViewportDurationMs: undefined,
};

// Pixel distance below which adjacent events are collapsed into a single cluster marker.
// The overview ribbon is small and dense by nature, so it uses a much more generous threshold
// than the detail ribbon, where clustering should only kick in as a last resort.
export const DEFAULT_OVERVIEW_CLUSTER_PIXEL_THRESHOLD = 6;
export const DEFAULT_DETAIL_CLUSTER_PIXEL_THRESHOLD = 2;

// Above this many events, a detail-ribbon cluster can't usefully be zoomed apart within
// minViewportDurationMs, so clicking it opens a scrollable list instead of re-zooming.
export const DEFAULT_MAX_DETAIL_MARKERS_PER_CLUSTER = 30;

// A pointerdown->pointerup movement below this distance is treated as a click rather than a drag.
export const CLICK_DRAG_THRESHOLD_PX = 4;

// The cursor-following hover indicator only snaps to an event/cluster once it's within this many
// pixels of it; further away, it just follows the raw cursor position instead of jumping around.
export const HOVER_SNAP_THRESHOLD_PX = 16;

// While scrub-dragging (Shift+drag), holding the cursor within this many pixels of either ribbon
// edge auto-pans the viewport toward that edge, at this many pixels/second, so events beyond the
// current view stay reachable without needing to release and re-drag.
export const SCRUB_EDGE_AUTO_PAN_THRESHOLD_PX = 40;
export const SCRUB_EDGE_AUTO_PAN_SPEED_PX_PER_SEC = 250;

// When an already-visible event is (re)selected (detail click / prev-next nav), the viewport is
// only panned - not fully recomputed - if the event already falls within this fraction range of
// the ribbon width. Otherwise it's treated as "off-screen" and a full neighbourhood recompute runs.
export const VIEWPORT_SAFE_ZONE_START_FRACTION = 0.1;
export const VIEWPORT_SAFE_ZONE_END_FRACTION = 0.9;

export const WHEEL_ZOOM_SENSITIVITY = 0.0015;
export const PINCH_ZOOM_SENSITIVITY = 0.01;
export const MAX_ZOOM_STEP_FRACTION = 0.5;

export const MIN_TICK_SPACING_PX = 80;

// "Nice" tick step sizes, in milliseconds, used by getAxisTicks. Not calendar-aware (e.g. "month"
// is approximated as 30 days) - acceptable for axis labeling, not for exact date arithmetic.
export const NICE_TICK_STEPS_MS = [
    1000, // 1s
    5000, // 5s
    15000, // 15s
    30000, // 30s
    60 * 1000, // 1min
    5 * 60 * 1000, // 5min
    15 * 60 * 1000, // 15min
    30 * 60 * 1000, // 30min
    60 * 60 * 1000, // 1h
    3 * 60 * 60 * 1000, // 3h
    6 * 60 * 60 * 1000, // 6h
    12 * 60 * 60 * 1000, // 12h
    24 * 60 * 60 * 1000, // 1d
    7 * 24 * 60 * 60 * 1000, // 1wk
    30 * 24 * 60 * 60 * 1000, // ~1mo
    90 * 24 * 60 * 60 * 1000, // ~3mo
    365 * 24 * 60 * 60 * 1000, // ~1yr
    2 * 365 * 24 * 60 * 60 * 1000, // ~2yr
    5 * 365 * 24 * 60 * 60 * 1000, // ~5yr
];

export const RIBBON_HEIGHT_CLASS_NAMES = {
    overview: "h-6",
    detail: "h-10",
};

// Padding applied to the auto-derived full range (min/max event timestamp) so events exactly at
// the start/end don't sit flush against the ribbon's border. Only applied when the consumer hasn't
// passed explicit rangeStart/rangeEnd props (those are respected exactly, unpadded).
export const RANGE_PADDING_FRACTION = 0.03;

// Hover tone must match the base fill's own tier (emphasis "-strong" fills pair with "-strong-hover",
// not the muted "-hover" token used for surface/transparent fills - see Button's VARIANT_TONE_CLASSES).
export const EVENT_MARKER_CLASS_NAMES = {
    default: "bg-neutral-strong hover:bg-neutral-strong-hover",
    selected: "bg-accent-strong hover:bg-accent-strong-hover outline-2 outline-offset-1 outline-accent-strong",
};

export const CLUSTER_MARKER_CLASS_NAMES =
    "bg-accent-surface hover:bg-accent-hover text-accent-strong border border-accent-subtle";

export const VIEWPORT_RECT_CLASS_NAMES = "bg-accent-hover/50 border border-accent";
export const VIEWPORT_RECT_HANDLE_CLASS_NAMES = "bg-accent-strong cursor-ew-resize";
