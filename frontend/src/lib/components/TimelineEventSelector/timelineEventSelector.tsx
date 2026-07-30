import React from "react";

import { clamp } from "lodash";
import { Key } from "ts-key-enum";

import { formatDate } from "@lib/utils/dates";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useComponentSize } from "../_shared/contexts/componentSizeContext";
import { withDefaults } from "../_shared/utils/defaultProps";
import type { SelectableSize } from "../_shared/utils/size";
import { resolveWrapperProps, type ComponentWrapperProps } from "../_shared/utils/wrapperProps";

import { DetailRibbon } from "./_components/detailRibbon";
import { NavControls } from "./_components/navControls";
import { OverviewRibbon } from "./_components/overviewRibbon";
import {
    DEFAULT_NEIGHBOURHOOD_OPTIONS,
    DEFAULT_DETAIL_CLUSTER_PIXEL_THRESHOLD,
    DEFAULT_MAX_DETAIL_MARKERS_PER_CLUSTER,
    DEFAULT_OVERVIEW_CLUSTER_PIXEL_THRESHOLD,
    RANGE_PADDING_FRACTION,
} from "./_constants";
import {
    clampViewportToRange,
    computeAutoZoomViewport,
    computeClusterFitViewport,
    computeNeighbourhoodViewport,
    findAdjacentEvent,
    sortEventsByTimestamp,
    viewportsEqual,
} from "./_utils";
import type {
    EventCluster,
    NeighbourhoodOptions,
    SelectedEventChangeDetails,
    SelectedEventChangeReason,
    TimeViewport,
    TimelineEvent,
    ViewportChangeDetails,
    ViewportChangeReason,
} from "./types";

export type TimelineEventSelectorProps = ComponentWrapperProps<React.HTMLAttributes<HTMLDivElement>> & {
    /** The full set of selectable events. Does not need to be pre-sorted. */
    events: TimelineEvent[];

    /** Overall selectable time range. Defaults to the min/max timestamp across `events`. */
    rangeStart?: Date;
    rangeEnd?: Date;

    /** Controlled selected event id. `null` means no selection. Omit for uncontrolled. */
    selectedEventId?: string | null;
    /** Initial selection when uncontrolled. @default null */
    defaultSelectedEventId?: string | null;
    onSelectedEventChange?: (eventId: string | null, details: SelectedEventChangeDetails) => void;

    /** Controlled detail-ribbon viewport. Omit for uncontrolled. */
    viewport?: TimeViewport;
    /** Initial viewport when uncontrolled. Defaults to the auto-computed neighbourhood of the initial selection, or the full range if nothing is selected. */
    defaultViewport?: TimeViewport;
    onViewportChange?: (viewport: TimeViewport, details: ViewportChangeDetails) => void;

    /**
     * Whether selecting a new event should auto-recompute/pan the viewport to keep it in view.
     * When `viewport` is externally controlled, the component still emits the suggested viewport
     * via `onViewportChange` but never applies it itself.
     * @default true
     */
    autoZoomOnSelect?: boolean;

    /** Tunable knobs for the gap-based neighbourhood/auto-zoom algorithm. */
    neighbourhoodOptions?: Partial<NeighbourhoodOptions>;

    /** Floor for the viewport duration, in ms. @default neighbourhoodOptions.minViewportDurationMs (1 hour) */
    minViewportDurationMs?: number;
    /** Ceiling for the viewport duration, in ms. @default the full selectable range span */
    maxViewportDurationMs?: number;

    /** Pixel distance below which adjacent events collapse into a cluster marker in the overview ribbon. */
    overviewClusterPixelThreshold?: number;
    /** Pixel distance below which adjacent events collapse into a cluster marker in the detail ribbon. */
    detailClusterPixelThreshold?: number;
    /** Above this many events, clicking a detail-ribbon cluster opens a list instead of zooming in. */
    maxDetailMarkersPerCluster?: number;

    /** Formats an event's timestamp for its tooltip. @default a locale date/time string */
    formatTimestamp?: (date: Date) => string;
    /** Overrides the full tooltip content for an event. Takes priority over `formatTimestamp`. */
    renderEventTooltip?: (event: TimelineEvent) => string;

    size?: SelectableSize;
    disabled?: boolean;
    /** Enables arrow-left/arrow-right navigation to the previous/next event while focused. @default true */
    enableKeyboardNav?: boolean;

    /** Extra controls (e.g. a `TimelineAutoplayButton`) rendered in the same row as the built-in prev/next/zoom controls, before them. */
    extraControls?: React.ReactNode;
};

const DEFAULT_PROPS = {
    autoZoomOnSelect: true,
    enableKeyboardNav: true,
    overviewClusterPixelThreshold: DEFAULT_OVERVIEW_CLUSTER_PIXEL_THRESHOLD,
    detailClusterPixelThreshold: DEFAULT_DETAIL_CLUSTER_PIXEL_THRESHOLD,
    maxDetailMarkersPerCluster: DEFAULT_MAX_DETAIL_MARKERS_PER_CLUSTER,
} satisfies Partial<TimelineEventSelectorProps>;

export const TimelineEventSelector = React.forwardRef<HTMLDivElement, TimelineEventSelectorProps>(
    function TimelineEventSelector(props, ref): React.ReactNode {
        const defaultedProps = withDefaults(props, DEFAULT_PROPS);
        const baseProps = resolveWrapperProps(
            defaultedProps,
            "events",
            "rangeStart",
            "rangeEnd",
            "selectedEventId",
            "defaultSelectedEventId",
            "onSelectedEventChange",
            "viewport",
            "defaultViewport",
            "onViewportChange",
            "autoZoomOnSelect",
            "neighbourhoodOptions",
            "minViewportDurationMs",
            "maxViewportDurationMs",
            "overviewClusterPixelThreshold",
            "detailClusterPixelThreshold",
            "maxDetailMarkersPerCluster",
            "formatTimestamp",
            "renderEventTooltip",
            "size",
            "disabled",
            "enableKeyboardNav",
            "extraControls",
        );

        const componentSize = useComponentSize(props);

        const neighbourhoodOptions = React.useMemo<NeighbourhoodOptions>(
            () => ({ ...DEFAULT_NEIGHBOURHOOD_OPTIONS, ...props.neighbourhoodOptions }),
            [props.neighbourhoodOptions],
        );

        const sortedEvents = React.useMemo(() => sortEventsByTimestamp(props.events), [props.events]);

        const fullRange = React.useMemo<TimeViewport>(() => {
            const rawStart = props.rangeStart ?? sortedEvents[0]?.timestamp ?? new Date();
            const rawEnd = props.rangeEnd ?? sortedEvents[sortedEvents.length - 1]?.timestamp ?? new Date();
            const [start, end] = rawStart.getTime() <= rawEnd.getTime() ? [rawStart, rawEnd] : [rawEnd, rawStart];

            // Only pad an auto-derived range (min/max event timestamp) so edge events aren't flush
            // against the ribbon border - an explicitly-provided rangeStart/rangeEnd is respected exactly.
            if (props.rangeStart !== undefined || props.rangeEnd !== undefined) return { start, end };

            const span = end.getTime() - start.getTime();
            const padding = span > 0 ? span * RANGE_PADDING_FRACTION : neighbourhoodOptions.minViewportDurationMs / 2;
            return { start: new Date(start.getTime() - padding), end: new Date(end.getTime() + padding) };
        }, [props.rangeStart, props.rangeEnd, sortedEvents, neighbourhoodOptions.minViewportDurationMs]);

        const minViewportDurationMs = props.minViewportDurationMs ?? neighbourhoodOptions.minViewportDurationMs;
        const maxViewportDurationMs = props.maxViewportDurationMs ?? fullRange.end.getTime() - fullRange.start.getTime();

        // --- Selection state: manual controlled/uncontrolled pattern (mirrors Slider's internalValue sync) ---
        const [internalSelectedEventId, setInternalSelectedEventId] = React.useState<string | null>(
            () => props.selectedEventId ?? props.defaultSelectedEventId ?? null,
        );
        if (props.selectedEventId !== undefined && props.selectedEventId !== internalSelectedEventId) {
            setInternalSelectedEventId(props.selectedEventId);
        }
        const selectedEventId = internalSelectedEventId;

        function updateSelectedEventId(id: string | null, reason: SelectedEventChangeReason) {
            setInternalSelectedEventId(id);
            props.onSelectedEventChange?.(id, { reason });
        }

        // --- Viewport state: same pattern, using value-based equality since TimeViewport is an object ---
        const [internalViewport, setInternalViewport] = React.useState<TimeViewport>(() => {
            if (props.viewport) return props.viewport;
            if (props.defaultViewport) return props.defaultViewport;
            const initialId = props.selectedEventId ?? props.defaultSelectedEventId ?? null;
            const initialEvent = initialId ? sortedEvents.find((e) => e.id === initialId) : undefined;
            if (initialEvent) {
                return computeNeighbourhoodViewport(sortedEvents, initialEvent.id, fullRange, neighbourhoodOptions);
            }
            return fullRange;
        });
        if (props.viewport !== undefined && !viewportsEqual(props.viewport, internalViewport)) {
            setInternalViewport(props.viewport);
        }
        const viewport = internalViewport;

        // `fullRange` only changes reference when the underlying data actually changes (see its
        // useMemo deps above) - this re-derives an uncontrolled viewport whenever that happens after
        // mount, since otherwise a viewport computed once against events that hadn't loaded yet (a
        // common case with async data sources) would never get corrected once the real data arrives.
        const isInitialFullRangeRef = React.useRef(true);
        React.useEffect(
            function rederiveViewportWhenFullRangeChanges() {
                if (isInitialFullRangeRef.current) {
                    isInitialFullRangeRef.current = false;
                    return;
                }
                if (props.viewport !== undefined) return;

                setInternalViewport((current) => {
                    const stillOverlapsData =
                        current.start.getTime() < fullRange.end.getTime() && current.end.getTime() > fullRange.start.getTime();
                    if (stillOverlapsData) return clampViewportToRange(current, fullRange);

                    const currentEvent = selectedEventId ? sortedEvents.find((e) => e.id === selectedEventId) : undefined;
                    if (currentEvent) return computeNeighbourhoodViewport(sortedEvents, currentEvent.id, fullRange, neighbourhoodOptions);
                    return fullRange;
                });
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [fullRange],
        );

        function updateViewport(vp: TimeViewport, reason: ViewportChangeReason) {
            setInternalViewport(vp);
            props.onViewportChange?.(vp, { reason });
        }

        function selectEvent(event: TimelineEvent, reason: SelectedEventChangeReason) {
            updateSelectedEventId(event.id, reason);
            // Scrubbing (Shift+drag) is a slider-like gesture over the *currently visible* events -
            // it should never move the viewport out from under the cursor mid-drag.
            if (reason === "scrub") return;
            if (!defaultedProps.autoZoomOnSelect) return;
            const auto = computeAutoZoomViewport(sortedEvents, event, viewport, fullRange, reason, neighbourhoodOptions);
            if (auto) updateViewport(auto.viewport, auto.reason);
        }

        // Externally-driven (controlled-prop) selection changes go through the same auto-zoom rule,
        // but as an effect rather than inline in the render-time sync above, since it's a derived
        // side effect (suggesting/applying a viewport) rather than the sync itself.
        const prevExternalSelectedEventIdRef = React.useRef(props.selectedEventId);
        React.useEffect(
            function autoZoomOnExternalSelectionChange() {
                if (props.selectedEventId === undefined) return;
                if (props.selectedEventId === prevExternalSelectedEventIdRef.current) return;
                prevExternalSelectedEventIdRef.current = props.selectedEventId;

                if (!defaultedProps.autoZoomOnSelect || props.selectedEventId === null) return;
                const changedEvent = sortedEvents.find((e) => e.id === props.selectedEventId);
                if (!changedEvent) return;

                const auto = computeAutoZoomViewport(
                    sortedEvents,
                    changedEvent,
                    viewport,
                    fullRange,
                    "programmatic",
                    neighbourhoodOptions,
                );
                if (auto) updateViewport(auto.viewport, auto.reason);
            },
            // eslint-disable-next-line react-hooks/exhaustive-deps
            [props.selectedEventId, defaultedProps.autoZoomOnSelect, sortedEvents, fullRange, neighbourhoodOptions],
        );

        function getTooltipContent(event: TimelineEvent): string {
            if (props.renderEventTooltip) return props.renderEventTooltip(event);
            const formattedTime = props.formatTimestamp ? props.formatTimestamp(event.timestamp) : formatDate(event.timestamp);
            return `${event.label} — ${formattedTime}`;
        }

        function getClusterTooltipContent(cluster: EventCluster): string {
            const formatTs = props.formatTimestamp ?? formatDate;
            const first = cluster.events[0];
            const last = cluster.events[cluster.events.length - 1];
            const count = `${cluster.events.length} events`;
            if (first.timestamp.getTime() === last.timestamp.getTime()) {
                return `${count} at ${formatTs(first.timestamp)}`;
            }
            return `${count}, ${formatTs(first.timestamp)} – ${formatTs(last.timestamp)}`;
        }

        function handleZoomIntoCluster(cluster: EventCluster) {
            const newViewport = computeClusterFitViewport(cluster, fullRange, neighbourhoodOptions);
            updateViewport(newViewport, "auto-zoom");
        }

        function handleOverviewClusterClick(cluster: EventCluster) {
            const middleEvent = cluster.events[Math.floor(cluster.events.length / 2)];
            updateSelectedEventId(middleEvent.id, "overview-click");
            if (!defaultedProps.autoZoomOnSelect) return;
            const newViewport = computeClusterFitViewport(cluster, fullRange, neighbourhoodOptions);
            updateViewport(newViewport, "overview-click-focus");
        }

        function handleSelectEventFromList(eventId: string) {
            const event = sortedEvents.find((e) => e.id === eventId);
            if (event) selectEvent(event, "detail-click");
        }

        function handlePrev() {
            const adjacent = findAdjacentEvent(sortedEvents, selectedEventId, "prev");
            if (adjacent) selectEvent(adjacent, "prev-next-nav");
        }

        function handleNext() {
            const adjacent = findAdjacentEvent(sortedEvents, selectedEventId, "next");
            if (adjacent) selectEvent(adjacent, "prev-next-nav");
        }

        function zoomByFactor(factor: number) {
            const durationMs = viewport.end.getTime() - viewport.start.getTime();
            const centerMs = (viewport.start.getTime() + viewport.end.getTime()) / 2;
            const newDurationMs = clamp(durationMs * factor, minViewportDurationMs, maxViewportDurationMs);
            const newViewport = clampViewportToRange(
                { start: new Date(centerMs - newDurationMs / 2), end: new Date(centerMs + newDurationMs / 2) },
                fullRange,
            );
            updateViewport(newViewport, "wheel-zoom");
        }

        function handleKeyDown(evt: React.KeyboardEvent<HTMLDivElement>) {
            if (!defaultedProps.enableKeyboardNav || props.disabled) return;
            if (evt.key !== Key.ArrowLeft && evt.key !== Key.ArrowRight) return;

            evt.preventDefault();
            const adjacent = findAdjacentEvent(sortedEvents, selectedEventId, evt.key === Key.ArrowRight ? "next" : "prev");
            if (adjacent) selectEvent(adjacent, "prev-next-nav");
        }

        const canGoPrev = findAdjacentEvent(sortedEvents, selectedEventId, "prev") !== null;
        const canGoNext = findAdjacentEvent(sortedEvents, selectedEventId, "next") !== null;

        return (
            <div
                {...baseProps}
                ref={ref}
                tabIndex={props.disabled ? undefined : 0}
                aria-disabled={props.disabled || undefined}
                onKeyDown={handleKeyDown}
                className={resolveClassNames(
                    baseProps.className,
                    "gap-sm outline-accent flex flex-col rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2",
                    { "pointer-events-none opacity-50": Boolean(props.disabled) },
                )}
            >
                <div className="flex flex-col">
                    <OverviewRibbon
                        sortedEvents={sortedEvents}
                        fullRange={fullRange}
                        viewport={viewport}
                        selectedEventId={selectedEventId}
                        clusterPixelThreshold={defaultedProps.overviewClusterPixelThreshold}
                        minViewportDurationMs={minViewportDurationMs}
                        disabled={props.disabled}
                        formatTooltip={getTooltipContent}
                        formatClusterTooltip={getClusterTooltipContent}
                        onBackgroundClick={(event) => selectEvent(event, "overview-click")}
                        onClusterClick={handleOverviewClusterClick}
                        onPanViewport={(vp) => updateViewport(vp, "drag-pan")}
                        onResizeViewportEdge={(_edge, vp) => updateViewport(vp, "edge-resize")}
                    />

                    <DetailRibbon
                        sortedEvents={sortedEvents}
                        viewport={viewport}
                        fullRange={fullRange}
                        selectedEventId={selectedEventId}
                        clusterPixelThreshold={defaultedProps.detailClusterPixelThreshold}
                        maxMarkersBeforeList={defaultedProps.maxDetailMarkersPerCluster}
                        minViewportDurationMs={minViewportDurationMs}
                        maxViewportDurationMs={maxViewportDurationMs}
                        disabled={props.disabled}
                        formatTooltip={getTooltipContent}
                        formatClusterTooltip={getClusterTooltipContent}
                        onSelectEvent={(event, reason) => selectEvent(event, reason)}
                        onSelectEventFromList={handleSelectEventFromList}
                        onPanViewport={(vp) => updateViewport(vp, "drag-pan")}
                        onZoomViewport={(vp, reason) => updateViewport(vp, reason)}
                        onZoomIntoCluster={handleZoomIntoCluster}
                        onSelectedEventStillClustered={handleZoomIntoCluster}
                    />
                </div>

                <div className="gap-xs flex items-center justify-end">
                    {props.extraControls}
                    <NavControls
                        size={componentSize}
                        canGoPrev={canGoPrev}
                        canGoNext={canGoNext}
                        disabled={props.disabled}
                        onPrev={handlePrev}
                        onNext={handleNext}
                        onZoomIn={() => zoomByFactor(0.5)}
                        onZoomOut={() => zoomByFactor(2)}
                    />
                </div>
            </div>
        );
    },
);
