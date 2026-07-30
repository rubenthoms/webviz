import React from "react";

import { clamp } from "lodash";

import { useElementSize } from "@lib/hooks/useElementSize";
import { formatDate } from "@lib/utils/dates";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import {
    HOVER_SNAP_THRESHOLD_PX,
    RIBBON_HEIGHT_CLASS_NAMES,
    SCRUB_EDGE_AUTO_PAN_SPEED_PX_PER_SEC,
    SCRUB_EDGE_AUTO_PAN_THRESHOLD_PX,
} from "../_constants";
import { usePointerDrag, useWheelZoom } from "../_hooks";
import { clampViewportToRange, clusterEvents, findNearestEvent, isEventInViewport, pixelDeltaToMs, pixelToTime, timeToPixel } from "../_utils";
import type { EventCluster, TimeViewport, TimelineEvent } from "../types";

import { AxisTicks } from "./axisTicks";
import { ClusterMarker } from "./clusterMarker";
import { EventMarker } from "./eventMarker";
import { HoverIndicator } from "./hoverIndicator";
import { SelectedMarkerIndicator } from "./selectedMarkerIndicator";

export type DetailRibbonProps = {
    sortedEvents: TimelineEvent[];
    viewport: TimeViewport;
    fullRange: TimeViewport;
    selectedEventId: string | null;
    clusterPixelThreshold: number;
    maxMarkersBeforeList: number;
    minViewportDurationMs: number;
    maxViewportDurationMs: number;
    disabled?: boolean;
    formatTooltip: (event: TimelineEvent) => string;
    formatClusterTooltip: (cluster: EventCluster) => string;
    onSelectEvent: (event: TimelineEvent, reason: "detail-click" | "scrub") => void;
    onSelectEventFromList: (eventId: string) => void;
    onPanViewport: (viewport: TimeViewport) => void;
    onZoomViewport: (viewport: TimeViewport, reason: "wheel-zoom" | "pinch-zoom") => void;
    onZoomIntoCluster: (cluster: EventCluster) => void;
    /**
     * Called when the selected event changes and, at the ribbon's current zoom level, still renders
     * as part of a multi-event cluster (e.g. after prev/next-navigating into a dense group) - lets
     * the caller zoom in further so the newly selected event is actually visible on its own.
     */
    onSelectedEventStillClustered: (cluster: EventCluster) => void;
};

export function DetailRibbon(props: DetailRibbonProps): React.ReactNode {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(containerRef);
    const dragStartViewportRef = React.useRef<TimeViewport | null>(null);
    // A drag started while holding Shift scrubs the selection (like a slider thumb) across whatever
    // is currently visible, instead of panning - captured once at pointerdown so releasing Shift
    // mid-drag doesn't switch modes underneath the user.
    const isScrubDragRef = React.useRef(false);

    const clusters = React.useMemo(
        () =>
            clusterEvents(props.sortedEvents, props.viewport, size.width, props.clusterPixelThreshold).filter((cluster) =>
                cluster.events.some((event) => isEventInViewport(event, props.viewport)),
            ),
        [props.sortedEvents, props.viewport, size.width, props.clusterPixelThreshold],
    );

    // Only shown when the selected event is individually visible (not merged into a cluster badge)
    // at the current zoom - dragging it only makes sense once there's an exact pixel to grab.
    const selectedEventEntry = clusters.find((cluster) => cluster.events.some((e) => e.id === props.selectedEventId));
    const selectedMarkerPixelLeft =
        selectedEventEntry && !selectedEventEntry.isCluster
            ? timeToPixel(selectedEventEntry.events[0].timestamp, props.viewport, size.width)
            : null;

    const { selectedEventId, onSelectedEventStillClustered } = props;
    const prevSelectedEventIdRef = React.useRef(selectedEventId);
    React.useEffect(
        function expandClusterOnNewlySelectedEvent() {
            if (selectedEventId === prevSelectedEventIdRef.current) return;
            prevSelectedEventIdRef.current = selectedEventId;
            if (!selectedEventId) return;
            // Scrubbing deliberately stays at the current zoom, sampling whatever's visible - even a
            // cluster badge - rather than auto-expanding into it like prev/next-nav or a direct click.
            if (isScrubDragRef.current) return;

            const stillClustered = clusters.find(
                (cluster) => cluster.isCluster && cluster.events.some((e) => e.id === selectedEventId),
            );
            if (stillClustered) onSelectedEventStillClustered(stillClustered);
        },
        [selectedEventId, clusters, onSelectedEventStillClustered],
    );

    const [hoveredPixel, setHoveredPixel] = React.useState<number | null>(null);

    const { viewport, formatTooltip, formatClusterTooltip } = props;

    // Follows the raw cursor position by default; only locks onto an event/cluster's exact pixel
    // once the cursor is within HOVER_SNAP_THRESHOLD_PX of it, so it doesn't jump around when the
    // cursor is nowhere near anything.
    const snapInfo = React.useMemo(() => {
        if (hoveredPixel === null || size.width <= 0) return null;
        if (clusters.length === 0) return { pixelLeft: hoveredPixel, label: formatDate(pixelToTime(hoveredPixel, viewport, size.width)) };

        const nearest = clusters.reduce((closest, cluster) => {
            const pixel = timeToPixel(cluster.isCluster ? cluster.centerTimestamp : cluster.events[0].timestamp, viewport, size.width);
            const closestPixel = timeToPixel(
                closest.isCluster ? closest.centerTimestamp : closest.events[0].timestamp,
                viewport,
                size.width,
            );
            return Math.abs(pixel - hoveredPixel) < Math.abs(closestPixel - hoveredPixel) ? cluster : closest;
        });
        const nearestPixel = timeToPixel(
            nearest.isCluster ? nearest.centerTimestamp : nearest.events[0].timestamp,
            viewport,
            size.width,
        );

        if (Math.abs(nearestPixel - hoveredPixel) <= HOVER_SNAP_THRESHOLD_PX) {
            return {
                pixelLeft: nearestPixel,
                label: nearest.isCluster ? formatClusterTooltip(nearest) : formatTooltip(nearest.events[0]),
            };
        }

        return { pixelLeft: hoveredPixel, label: formatDate(pixelToTime(hoveredPixel, viewport, size.width)) };
    }, [hoveredPixel, clusters, viewport, size.width, formatTooltip, formatClusterTooltip]);

    const lastScrubbedEventIdRef = React.useRef<string | null>(null);
    const scrubPointerPixelRef = React.useRef<number | null>(null);

    function scrubSelectAtPixel(pixel: number) {
        scrubPointerPixelRef.current = pixel;
        if (props.disabled || props.sortedEvents.length === 0) return;
        const nearest = findNearestEvent(props.sortedEvents, pixelToTime(pixel, props.viewport, size.width));
        if (!nearest) return;
        lastScrubbedEventIdRef.current = nearest.id;
        props.onSelectEvent(nearest, "scrub");
    }

    // Continuously updated every render so the self-perpetuating rAF loop below (which keeps calling
    // itself via its own closure across many renders) always reads fresh values instead of whatever
    // was current the moment the loop happened to start.
    const latestRef = React.useRef({
        viewport: props.viewport,
        fullRange: props.fullRange,
        pixelWidth: size.width,
        sortedEvents: props.sortedEvents,
        disabled: props.disabled,
        onPanViewport: props.onPanViewport,
        onSelectEvent: props.onSelectEvent,
    });
    latestRef.current = {
        viewport: props.viewport,
        fullRange: props.fullRange,
        pixelWidth: size.width,
        sortedEvents: props.sortedEvents,
        disabled: props.disabled,
        onPanViewport: props.onPanViewport,
        onSelectEvent: props.onSelectEvent,
    };

    const autoPanFrameRef = React.useRef<number | null>(null);
    const autoPanLastTimestampRef = React.useRef<number | null>(null);

    function stopEdgeAutoPan() {
        if (autoPanFrameRef.current !== null) cancelAnimationFrame(autoPanFrameRef.current);
        autoPanFrameRef.current = null;
        autoPanLastTimestampRef.current = null;
    }

    // While scrubbing, holding the cursor near either edge keeps panning the viewport toward it (and
    // re-selecting whatever's now nearest) for as long as it stays there - even without further
    // pointer movement - so events beyond the current view stay reachable mid-drag.
    function edgeAutoPanTick(timestamp: number) {
        autoPanFrameRef.current = requestAnimationFrame(edgeAutoPanTick);

        const lastTimestamp = autoPanLastTimestampRef.current;
        autoPanLastTimestampRef.current = timestamp;
        if (lastTimestamp === null) return;

        const pixel = scrubPointerPixelRef.current;
        const { viewport, fullRange, pixelWidth, sortedEvents, disabled, onPanViewport, onSelectEvent } = latestRef.current;
        if (pixel === null || pixelWidth <= 0 || disabled) return;

        let direction = 0;
        if (pixel < SCRUB_EDGE_AUTO_PAN_THRESHOLD_PX) direction = -1;
        else if (pixel > pixelWidth - SCRUB_EDGE_AUTO_PAN_THRESHOLD_PX) direction = 1;
        if (direction === 0) return;

        const dtSec = (timestamp - lastTimestamp) / 1000;
        const deltaMs = pixelDeltaToMs(direction * SCRUB_EDGE_AUTO_PAN_SPEED_PX_PER_SEC * dtSec, viewport, pixelWidth);
        const shiftedViewport = clampViewportToRange(
            { start: new Date(viewport.start.getTime() + deltaMs), end: new Date(viewport.end.getTime() + deltaMs) },
            fullRange,
        );
        onPanViewport(shiftedViewport);

        if (sortedEvents.length === 0) return;
        const nearest = findNearestEvent(sortedEvents, pixelToTime(pixel, shiftedViewport, pixelWidth));
        if (nearest) {
            lastScrubbedEventIdRef.current = nearest.id;
            onSelectEvent(nearest, "scrub");
        }
    }

    const {
        onPointerDown: onDragPointerDown,
        onPointerMove: onDragPointerMove,
        onPointerUp,
    } = usePointerDrag(containerRef, {
        onDragStart: (startPixel) => {
            if (isScrubDragRef.current) {
                scrubSelectAtPixel(startPixel);
                if (autoPanFrameRef.current === null) autoPanFrameRef.current = requestAnimationFrame(edgeAutoPanTick);
                return;
            }
            dragStartViewportRef.current = props.viewport;
        },
        onDragMove: (deltaPx, currentPixel) => {
            if (isScrubDragRef.current) {
                scrubSelectAtPixel(currentPixel);
                return;
            }
            if (props.disabled || !dragStartViewportRef.current) return;
            const deltaMs = pixelDeltaToMs(deltaPx, dragStartViewportRef.current, size.width);
            const shifted: TimeViewport = {
                start: new Date(dragStartViewportRef.current.start.getTime() + deltaMs),
                end: new Date(dragStartViewportRef.current.end.getTime() + deltaMs),
            };
            props.onPanViewport(clampViewportToRange(shifted, props.fullRange));
        },
        onDragEnd: () => {
            dragStartViewportRef.current = null;
            stopEdgeAutoPan();
            scrubPointerPixelRef.current = null;

            // A scrub that ends on a still-clustered event settles into a zoomed-in view of it -
            // deliberately only once, on release, so the viewport never moves while the drag is active.
            const scrubbedId = lastScrubbedEventIdRef.current;
            lastScrubbedEventIdRef.current = null;
            if (!isScrubDragRef.current || !scrubbedId) return;
            const stillClustered = clusters.find((cluster) => cluster.isCluster && cluster.events.some((e) => e.id === scrubbedId));
            if (stillClustered) onSelectedEventStillClustered(stillClustered);
        },
        onClick: (pixel) => {
            if (props.disabled || props.sortedEvents.length === 0) return;
            const clickedTime = pixelToTime(pixel, props.viewport, size.width);
            const nearest = findNearestEvent(props.sortedEvents, clickedTime);
            if (nearest) props.onSelectEvent(nearest, "detail-click");
        },
    });

    function handlePointerDown(evt: React.PointerEvent<HTMLDivElement>) {
        const startedOnSelectedMarker = (evt.target as HTMLElement).closest('[data-selected-marker="true"]') !== null;
        isScrubDragRef.current = startedOnSelectedMarker || evt.shiftKey;
        onDragPointerDown(evt);
    }

    React.useEffect(function stopEdgeAutoPanOnUnmount() {
        return stopEdgeAutoPan;
    }, []);

    useWheelZoom(
        containerRef,
        (cursorPixel, factor, reason) => {
            if (props.disabled) return;

            const originalDurationMs = props.viewport.end.getTime() - props.viewport.start.getTime();
            if (originalDurationMs <= 0) return;

            const cursorTimeMs = pixelToTime(cursorPixel, props.viewport, size.width).getTime();
            const fraction = (cursorTimeMs - props.viewport.start.getTime()) / originalDurationMs;
            const newDurationMs = clamp(originalDurationMs * factor, props.minViewportDurationMs, props.maxViewportDurationMs);
            const newStartMs = cursorTimeMs - fraction * newDurationMs;

            const newViewport = clampViewportToRange(
                { start: new Date(newStartMs), end: new Date(newStartMs + newDurationMs) },
                props.fullRange,
            );
            props.onZoomViewport(newViewport, reason);
        },
        props.disabled,
    );

    function handlePointerMove(evt: React.PointerEvent<HTMLDivElement>) {
        onDragPointerMove(evt);
        if (props.disabled) return;

        // Pointer capture (held during any drag) keeps delivering move events targeted at this
        // element even once the cursor has physically left its bounds - checked explicitly so the
        // hover crosshair/readout don't keep rendering outside the ribbon while that's happening.
        const rect = containerRef.current?.getBoundingClientRect();
        const isInsideBounds =
            !!rect && evt.clientX >= rect.left && evt.clientX <= rect.right && evt.clientY >= rect.top && evt.clientY <= rect.bottom;
        setHoveredPixel(isInsideBounds ? evt.clientX - rect.left : null);
    }

    function handlePointerLeave() {
        setHoveredPixel(null);
    }

    return (
        <div className="flex flex-col gap-1">
            <div
                ref={containerRef}
                className={resolveClassNames(
                    // No overflow clipping: markers exactly at the edges (pixel 0 / pixel = width) are
                    // horizontally centered on their timestamp via -translate-x-1/2, so half their box
                    // would otherwise fall outside the container and get clipped away entirely.
                    "bg-surface border-neutral-subtle relative w-full touch-none rounded-b-sm border select-none",
                    RIBBON_HEIGHT_CLASS_NAMES.detail,
                    props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerUp={onPointerUp}
            >
                {/* Rendered before the markers so it never sits on top of them - later siblings paint on
                    top and win hit-testing at the same point. */}
                {snapInfo && !props.disabled && <HoverIndicator pixelLeft={snapInfo.pixelLeft} />}

                {clusters.map((cluster) =>
                    cluster.isCluster ? (
                        <ClusterMarker
                            key={cluster.events[0].id}
                            cluster={cluster}
                            size="lg"
                            pixelLeft={timeToPixel(cluster.centerTimestamp, props.viewport, size.width)}
                            containsSelectedEvent={cluster.events.some((e) => e.id === props.selectedEventId)}
                            tooltipContent={props.formatClusterTooltip(cluster)}
                            showTooltip={false}
                            interactive={
                                props.disabled
                                    ? undefined
                                    : {
                                          maxMarkersBeforeList: props.maxMarkersBeforeList,
                                          onZoomIntoCluster: () => props.onZoomIntoCluster(cluster),
                                          onSelectEvent: props.onSelectEventFromList,
                                      }
                            }
                        />
                    ) : (
                        <EventMarker
                            key={cluster.events[0].id}
                            event={cluster.events[0]}
                            size="lg"
                            pixelLeft={timeToPixel(cluster.events[0].timestamp, props.viewport, size.width)}
                            isSelected={cluster.events[0].id === props.selectedEventId}
                            tooltipContent={props.formatTooltip(cluster.events[0])}
                            showTooltip={false}
                        />
                    ),
                )}

                {selectedMarkerPixelLeft !== null && (
                    <SelectedMarkerIndicator pixelLeft={selectedMarkerPixelLeft} disabled={props.disabled} />
                )}
            </div>

            <div className="relative">
                <AxisTicks range={props.viewport} pixelWidth={size.width} />
                {snapInfo && !props.disabled && (
                    <div
                        className="bg-canvas text-neutral-strong text-body-xs px-2xs py-4xs absolute top-0 -translate-x-1/2 rounded whitespace-nowrap shadow-md"
                        style={{ left: snapInfo.pixelLeft }}
                    >
                        {snapInfo.label}
                    </div>
                )}
            </div>
        </div>
    );
}
