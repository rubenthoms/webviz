import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CLICK_DRAG_THRESHOLD_PX, VIEWPORT_RECT_CLASS_NAMES, VIEWPORT_RECT_HANDLE_CLASS_NAMES } from "../_constants";
import { clampViewportToRange, pixelDeltaToMs, pixelToTime, timeToPixel } from "../_utils";
import type { TimeViewport } from "../types";

export type ViewportRectProps = {
    containerRef: React.RefObject<HTMLElement | null>;
    overviewRange: TimeViewport;
    overviewPixelWidth: number;
    viewport: TimeViewport;
    fullRange: TimeViewport;
    minViewportDurationMs: number;
    disabled?: boolean;
    onPan: (newViewport: TimeViewport) => void;
    onResizeEdge: (edge: "start" | "end", newViewport: TimeViewport) => void;
    /**
     * Called with the click's pixel offset (within `containerRef`) when the body is clicked
     * without being dragged. The rect otherwise sits on top of the ribbon and would silently
     * swallow clicks meant to select the nearest event - this keeps that behavior working even
     * when a click lands inside the current viewport's highlighted region.
     */
    onBodyClick: (pixel: number) => void;
};

type BodyDragState = {
    startClientX: number;
    startViewport: TimeViewport;
    dragging: boolean;
};

export function ViewportRect(props: ViewportRectProps): React.ReactNode {
    const dragStateRef = React.useRef<BodyDragState | null>(null);
    const resizingEdgeRef = React.useRef<"start" | "end" | null>(null);

    const left = timeToPixel(props.viewport.start, props.overviewRange, props.overviewPixelWidth);
    const right = timeToPixel(props.viewport.end, props.overviewRange, props.overviewPixelWidth);
    const width = Math.max(right - left, 4);

    function handleBodyPointerDown(evt: React.PointerEvent) {
        if (props.disabled) return;
        evt.currentTarget.setPointerCapture(evt.pointerId);
        evt.stopPropagation();
        dragStateRef.current = { startClientX: evt.clientX, startViewport: props.viewport, dragging: false };
    }

    function handleBodyPointerMove(evt: React.PointerEvent) {
        const state = dragStateRef.current;
        if (!state) return;

        const deltaPx = evt.clientX - state.startClientX;
        if (!state.dragging) {
            if (Math.abs(deltaPx) < CLICK_DRAG_THRESHOLD_PX) return;
            state.dragging = true;
        }

        const deltaMs = pixelDeltaToMs(deltaPx, props.overviewRange, props.overviewPixelWidth);
        const shifted: TimeViewport = {
            start: new Date(state.startViewport.start.getTime() + deltaMs),
            end: new Date(state.startViewport.end.getTime() + deltaMs),
        };
        props.onPan(clampViewportToRange(shifted, props.fullRange));
    }

    function handleBodyPointerUp(evt: React.PointerEvent) {
        evt.currentTarget.releasePointerCapture(evt.pointerId);

        const state = dragStateRef.current;
        dragStateRef.current = null;
        if (!state || state.dragging) return;

        const rect = props.containerRef.current?.getBoundingClientRect();
        props.onBodyClick(rect ? evt.clientX - rect.left : 0);
    }

    function handleEdgePointerDown(edge: "start" | "end") {
        return function onEdgePointerDown(evt: React.PointerEvent) {
            if (props.disabled) return;
            evt.currentTarget.setPointerCapture(evt.pointerId);
            evt.stopPropagation();
            resizingEdgeRef.current = edge;
        };
    }

    function handleEdgePointerMove(evt: React.PointerEvent) {
        const edge = resizingEdgeRef.current;
        if (!edge) return;

        const rect = props.containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const newTimeMs = pixelToTime(evt.clientX - rect.left, props.overviewRange, props.overviewPixelWidth).getTime();

        let newViewport: TimeViewport;
        if (edge === "start") {
            const maxStartMs = props.viewport.end.getTime() - props.minViewportDurationMs;
            newViewport = { start: new Date(Math.min(newTimeMs, maxStartMs)), end: props.viewport.end };
        } else {
            const minEndMs = props.viewport.start.getTime() + props.minViewportDurationMs;
            newViewport = { start: props.viewport.start, end: new Date(Math.max(newTimeMs, minEndMs)) };
        }

        props.onResizeEdge(edge, clampViewportToRange(newViewport, props.fullRange));
    }

    function handleEdgePointerUp(evt: React.PointerEvent) {
        evt.currentTarget.releasePointerCapture(evt.pointerId);
        resizingEdgeRef.current = null;
    }

    return (
        <div
            className={resolveClassNames("absolute top-0 h-full touch-none rounded-sm", VIEWPORT_RECT_CLASS_NAMES, {
                "cursor-grab": !props.disabled,
            })}
            style={{ left, width }}
            onPointerDown={handleBodyPointerDown}
            onPointerMove={handleBodyPointerMove}
            onPointerUp={handleBodyPointerUp}
        >
            <div
                className={resolveClassNames("absolute top-0 left-0 h-full w-1 touch-none rounded-l-sm", VIEWPORT_RECT_HANDLE_CLASS_NAMES)}
                onPointerDown={handleEdgePointerDown("start")}
                onPointerMove={handleEdgePointerMove}
                onPointerUp={handleEdgePointerUp}
            />
            <div
                className={resolveClassNames("absolute top-0 right-0 h-full w-1 touch-none rounded-r-sm", VIEWPORT_RECT_HANDLE_CLASS_NAMES)}
                onPointerDown={handleEdgePointerDown("end")}
                onPointerMove={handleEdgePointerMove}
                onPointerUp={handleEdgePointerUp}
            />
        </div>
    );
}
