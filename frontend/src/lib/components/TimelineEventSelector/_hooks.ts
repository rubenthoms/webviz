import React from "react";

import { clamp } from "lodash";

import { CLICK_DRAG_THRESHOLD_PX, MAX_ZOOM_STEP_FRACTION, PINCH_ZOOM_SENSITIVITY, WHEEL_ZOOM_SENSITIVITY } from "./_constants";

type PointerDragCallbacks = {
    onDragStart?: (startPixel: number) => void;
    onDragMove?: (deltaPixel: number, currentPixel: number) => void;
    onDragEnd?: (deltaPixel: number) => void;
    onClick?: (pixel: number) => void;
};

type DragState = {
    startClientX: number;
    startPixel: number;
    dragging: boolean;
};

/**
 * Shared pointer-capture drag handling (click vs. drag disambiguated by move distance), following
 * the same `setPointerCapture`/`getBoundingClientRect` pattern used by the `Slider` component.
 * Returns pointer event handlers to spread onto the interactive element.
 */
export function usePointerDrag(containerRef: React.RefObject<HTMLElement | null>, callbacks: PointerDragCallbacks) {
    const callbacksRef = React.useRef(callbacks);
    callbacksRef.current = callbacks;

    const dragStateRef = React.useRef<DragState | null>(null);

    const onPointerDown = React.useCallback(
        function onPointerDown(evt: React.PointerEvent) {
            evt.currentTarget.setPointerCapture(evt.pointerId);
            const rect = containerRef.current?.getBoundingClientRect();
            const startPixel = rect ? evt.clientX - rect.left : 0;
            dragStateRef.current = { startClientX: evt.clientX, startPixel, dragging: false };
        },
        [containerRef],
    );

    const onPointerMove = React.useCallback(
        function onPointerMove(evt: React.PointerEvent) {
            const state = dragStateRef.current;
            if (!state) return;

            const deltaClientX = evt.clientX - state.startClientX;

            if (!state.dragging) {
                if (Math.abs(deltaClientX) < CLICK_DRAG_THRESHOLD_PX) return;
                state.dragging = true;
                callbacksRef.current.onDragStart?.(state.startPixel);
            }

            const rect = containerRef.current?.getBoundingClientRect();
            const currentPixel = rect ? evt.clientX - rect.left : 0;
            callbacksRef.current.onDragMove?.(deltaClientX, currentPixel);
        },
        [containerRef],
    );

    const onPointerUp = React.useCallback(function onPointerUp(evt: React.PointerEvent) {
        evt.currentTarget.releasePointerCapture(evt.pointerId);

        const state = dragStateRef.current;
        dragStateRef.current = null;
        if (!state) return;

        if (state.dragging) {
            callbacksRef.current.onDragEnd?.(evt.clientX - state.startClientX);
        } else {
            callbacksRef.current.onClick?.(state.startPixel);
        }
    }, []);

    return { onPointerDown, onPointerMove, onPointerUp };
}

/**
 * Attaches a non-passive native wheel listener to `containerRef`'s element, so `preventDefault()`
 * reliably blocks page scroll (React's synthetic `onWheel` handler may be attached passively,
 * silently no-op'ing `preventDefault`). Reports the cursor's pixel offset within the container, a
 * zoom factor (>1 = zoom out, <1 = zoom in), and whether the gesture looks like trackpad pinch
 * (`ctrlKey`, the standard browser convention for reporting pinch as wheel events).
 */
export function useWheelZoom(
    containerRef: React.RefObject<HTMLElement | null>,
    onZoom: (cursorPixel: number, factor: number, reason: "wheel-zoom" | "pinch-zoom") => void,
    disabled?: boolean,
) {
    const onZoomRef = React.useRef(onZoom);
    onZoomRef.current = onZoom;

    React.useEffect(
        function attachWheelListener() {
            const el = containerRef.current;
            if (!el || disabled) return;

            function handleWheel(evt: WheelEvent) {
                evt.preventDefault();

                const rect = el!.getBoundingClientRect();
                const cursorPixel = evt.clientX - rect.left;
                const isPinch = evt.ctrlKey;
                const sensitivity = isPinch ? PINCH_ZOOM_SENSITIVITY : WHEEL_ZOOM_SENSITIVITY;
                const factor = 1 + clamp(evt.deltaY * sensitivity, -MAX_ZOOM_STEP_FRACTION, MAX_ZOOM_STEP_FRACTION);

                onZoomRef.current(cursorPixel, factor, isPinch ? "pinch-zoom" : "wheel-zoom");
            }

            el.addEventListener("wheel", handleWheel, { passive: false });
            return () => el.removeEventListener("wheel", handleWheel);
        },
        [containerRef, disabled],
    );
}
