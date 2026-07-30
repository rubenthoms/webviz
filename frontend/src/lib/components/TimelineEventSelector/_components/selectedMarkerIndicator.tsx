import type React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type SelectedMarkerIndicatorProps = {
    pixelLeft: number;
    disabled?: boolean;
};

const TRIANGLE_HALF_WIDTH_PX = 5;
const TRIANGLE_HEIGHT_PX = 6;

// Plain CSS triangles (the transparent-side-borders trick) built via inline style rather than Tailwind
// border-width utilities - this project's Tailwind setup resets the numeric spacing scale those would
// normally rely on (see foundation.css), so a hand-specified pixel style is the reliable option here.
const TRIANGLE_BASE_STYLE: React.CSSProperties = {
    width: 0,
    height: 0,
    borderLeft: `${TRIANGLE_HALF_WIDTH_PX}px solid transparent`,
    borderRight: `${TRIANGLE_HALF_WIDTH_PX}px solid transparent`,
};

/**
 * A persistent (always-visible, not just on hover) vertical thumb at the selected event's position -
 * a wider invisible strip around a thin line, so it's easy to grab and drag directly to scrub the
 * selection (same as Shift+drag), without needing to discover the modifier key first. Pinched by a
 * pair of triangles at the ribbon's top/bottom edges, pointing inward at the line.
 */
export function SelectedMarkerIndicator(props: SelectedMarkerIndicatorProps): React.ReactNode {
    return (
        <div
            data-selected-marker="true"
            className={resolveClassNames(
                "absolute top-0 z-10 h-full w-3 touch-none -translate-x-1/2",
                props.disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
            )}
            style={{ left: props.pixelLeft }}
        >
            <div className="bg-accent-strong pointer-events-none absolute top-0 left-1/2 h-full w-0.5 -translate-x-1/2" />
            <div
                className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2"
                style={{ ...TRIANGLE_BASE_STYLE, borderTop: `${TRIANGLE_HEIGHT_PX}px solid var(--eds-color-border-accent-strong)` }}
            />
            <div
                className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2"
                style={{ ...TRIANGLE_BASE_STYLE, borderBottom: `${TRIANGLE_HEIGHT_PX}px solid var(--eds-color-border-accent-strong)` }}
            />
        </div>
    );
}
