import type React from "react";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { EVENT_MARKER_CLASS_NAMES } from "../_constants";
import type { TimelineEvent } from "../types";

export type EventMarkerProps = {
    event: TimelineEvent;
    pixelLeft: number;
    isSelected: boolean;
    tooltipContent: string;
    size?: "sm" | "lg";
    /** Disable the hover tooltip - e.g. when a cursor-following readout already shows this info. @default true */
    showTooltip?: boolean;
};

export function EventMarker(props: EventMarkerProps): React.ReactNode {
    const marker = (
        <div
            data-event-id={props.event.id}
            className={resolveClassNames(
                // Note: this project's Tailwind setup resets `--spacing` (see foundation.css) and only
                // regenerates separate w-*/h-* utilities, not the combined size-* shorthand - size-*
                // silently resolves to nothing here, so width/height must be set explicitly.
                "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-sm transition-colors",
                props.size === "lg" ? "h-3 w-3" : "h-2 w-2",
                props.isSelected ? EVENT_MARKER_CLASS_NAMES.selected : EVENT_MARKER_CLASS_NAMES.default,
            )}
            style={{ left: props.pixelLeft }}
        />
    );

    if (props.showTooltip === false) return marker;
    return <Tooltip content={props.tooltipContent}>{marker}</Tooltip>;
}
