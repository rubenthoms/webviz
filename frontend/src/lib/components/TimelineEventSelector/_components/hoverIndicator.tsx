import type React from "react";

export type HoverIndicatorProps = {
    pixelLeft: number;
};

/** A cursor-following vertical line, snapped to the nearest event/cluster; spans its ribbon's own height. */
export function HoverIndicator(props: HoverIndicatorProps): React.ReactNode {
    return (
        <div
            className="bg-accent-strong pointer-events-none absolute top-0 h-full w-0.5 -translate-x-1/2"
            style={{ left: props.pixelLeft }}
        />
    );
}
