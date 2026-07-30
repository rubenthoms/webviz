import React from "react";

import { Popover } from "@lib/components/Popover";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { CLUSTER_MARKER_CLASS_NAMES } from "../_constants";
import type { EventCluster } from "../types";

import { EventListPopup } from "./eventListPopup";

export type ClusterMarkerInteractive = {
    /** Above this many events, clicking opens a scrollable list instead of zooming into the cluster. */
    maxMarkersBeforeList: number;
    onZoomIntoCluster: () => void;
    onSelectEvent: (eventId: string) => void;
};

export type ClusterMarkerProps = {
    cluster: EventCluster;
    pixelLeft: number;
    size?: "sm" | "lg";
    containsSelectedEvent: boolean;
    tooltipContent: string;
    /** When provided, the cluster becomes clickable (detail ribbon). Omit for a purely visual overview marker. */
    interactive?: ClusterMarkerInteractive;
    /** Disable the hover tooltip - e.g. when a cursor-following readout already shows this info. @default true */
    showTooltip?: boolean;
};

export function ClusterMarker(props: ClusterMarkerProps): React.ReactNode {
    const [listOpen, setListOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const showAsList = props.interactive !== undefined && props.cluster.events.length > props.interactive.maxMarkersBeforeList;

    // Intercepted at the pointer-event phase, not via onClick: the ribbon container ancestor also
    // listens for pointerdown/pointerup (to resolve plain background clicks to the nearest event),
    // and calling setPointerCapture there - which happens as this same pointerdown bubbles up -
    // redirects the browser's derived "click" event away from this element entirely, so an onClick
    // handler here would never fire. Stopping propagation at pointerdown prevents that capture.
    function handlePointerDown(evt: React.PointerEvent) {
        if (!props.interactive) return;
        evt.stopPropagation();
    }

    function handlePointerUp(evt: React.PointerEvent) {
        if (!props.interactive) return;
        evt.stopPropagation();
        if (showAsList) {
            setListOpen((open) => !open);
        } else {
            props.interactive.onZoomIntoCluster();
        }
    }

    const marker = (
        <div
            ref={anchorRef}
            role={props.interactive ? "button" : undefined}
            tabIndex={props.interactive ? 0 : undefined}
            className={resolveClassNames(
                "text-body-xs absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full leading-none",
                props.size === "lg" ? "h-5 min-w-5 px-1" : "h-3 min-w-3 px-0.5",
                CLUSTER_MARKER_CLASS_NAMES,
                {
                    "outline-accent-strong outline-2 outline-offset-2": props.containsSelectedEvent,
                    "cursor-pointer": Boolean(props.interactive),
                },
            )}
            style={{ left: props.pixelLeft }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
        >
            {props.cluster.events.length}
        </div>
    );

    if (!props.interactive || !showAsList) {
        if (props.showTooltip === false) return marker;
        return <Tooltip content={props.tooltipContent}>{marker}</Tooltip>;
    }

    return (
        <Popover.Root open={listOpen} onOpenChange={setListOpen}>
            {marker}
            <Popover.Popup anchor={anchorRef.current}>
                <EventListPopup
                    events={props.cluster.events}
                    onSelectEvent={(id) => {
                        setListOpen(false);
                        props.interactive?.onSelectEvent(id);
                    }}
                />
            </Popover.Popup>
        </Popover.Root>
    );
}
