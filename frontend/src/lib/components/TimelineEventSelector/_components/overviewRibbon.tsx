import React from "react";

import { useElementSize } from "@lib/hooks/useElementSize";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { RIBBON_HEIGHT_CLASS_NAMES } from "../_constants";
import { usePointerDrag } from "../_hooks";
import { clusterEvents, findNearestEvent, pixelToTime, timeToPixel } from "../_utils";
import type { EventCluster, TimeViewport, TimelineEvent } from "../types";

import { AxisTicks } from "./axisTicks";
import { ClusterMarker } from "./clusterMarker";
import { EventMarker } from "./eventMarker";
import { ViewportRect } from "./viewportRect";

export type OverviewRibbonProps = {
    sortedEvents: TimelineEvent[];
    fullRange: TimeViewport;
    viewport: TimeViewport;
    selectedEventId: string | null;
    clusterPixelThreshold: number;
    minViewportDurationMs: number;
    disabled?: boolean;
    formatTooltip: (event: TimelineEvent) => string;
    formatClusterTooltip: (cluster: EventCluster) => string;
    onBackgroundClick: (event: TimelineEvent) => void;
    onClusterClick: (cluster: EventCluster) => void;
    onPanViewport: (viewport: TimeViewport) => void;
    onResizeViewportEdge: (edge: "start" | "end", viewport: TimeViewport) => void;
};

export function OverviewRibbon(props: OverviewRibbonProps): React.ReactNode {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const size = useElementSize(containerRef);

    const clusters = React.useMemo(
        () => clusterEvents(props.sortedEvents, props.fullRange, size.width, props.clusterPixelThreshold),
        [props.sortedEvents, props.fullRange, size.width, props.clusterPixelThreshold],
    );

    function resolveAndSelectAtPixel(pixel: number) {
        if (props.disabled || props.sortedEvents.length === 0) return;
        const clickedTime = pixelToTime(pixel, props.fullRange, size.width);
        const nearest = findNearestEvent(props.sortedEvents, clickedTime);
        if (nearest) props.onBackgroundClick(nearest);
    }

    const { onPointerDown, onPointerMove, onPointerUp } = usePointerDrag(containerRef, {
        onClick: resolveAndSelectAtPixel,
    });

    return (
        <div className="flex flex-col">
            <AxisTicks range={props.fullRange} pixelWidth={size.width} position="above" />
            <div
                ref={containerRef}
                className={resolveClassNames(
                    // No overflow clipping: markers exactly at the edges (pixel 0 / pixel = width) are
                    // horizontally centered on their timestamp via -translate-x-1/2, so half their box
                    // would otherwise fall outside the container and get clipped away entirely.
                    "bg-canvas border-neutral-subtle relative w-full touch-none rounded-t-sm border select-none",
                    RIBBON_HEIGHT_CLASS_NAMES.overview,
                    props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
            >
                {/* Rendered before the markers so it never sits on top of (and swallows clicks meant for) an
                    event/cluster marker - later siblings paint on top and win hit-testing at the same point. */}
                {size.width > 0 && (
                    <ViewportRect
                        containerRef={containerRef}
                        overviewRange={props.fullRange}
                        overviewPixelWidth={size.width}
                        viewport={props.viewport}
                        fullRange={props.fullRange}
                        minViewportDurationMs={props.minViewportDurationMs}
                        disabled={props.disabled}
                        onPan={props.onPanViewport}
                        onResizeEdge={props.onResizeViewportEdge}
                        onBodyClick={resolveAndSelectAtPixel}
                    />
                )}

                {clusters.map((cluster) =>
                    cluster.isCluster ? (
                        <ClusterMarker
                            key={cluster.events[0].id}
                            cluster={cluster}
                            pixelLeft={timeToPixel(cluster.centerTimestamp, props.fullRange, size.width)}
                            containsSelectedEvent={cluster.events.some((e) => e.id === props.selectedEventId)}
                            tooltipContent={props.formatClusterTooltip(cluster)}
                            interactive={
                                props.disabled
                                    ? undefined
                                    : {
                                          // Overview clusters always zoom in (never show a list) - the detail
                                          // ribbon is where individual selection/lists happen.
                                          maxMarkersBeforeList: Infinity,
                                          onZoomIntoCluster: () => props.onClusterClick(cluster),
                                          onSelectEvent: () => {},
                                      }
                            }
                        />
                    ) : (
                        <EventMarker
                            key={cluster.events[0].id}
                            event={cluster.events[0]}
                            pixelLeft={timeToPixel(cluster.events[0].timestamp, props.fullRange, size.width)}
                            isSelected={cluster.events[0].id === props.selectedEventId}
                            tooltipContent={props.formatTooltip(cluster.events[0])}
                        />
                    ),
                )}
            </div>
        </div>
    );
}
