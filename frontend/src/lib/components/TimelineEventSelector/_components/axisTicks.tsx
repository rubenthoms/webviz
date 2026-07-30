import React from "react";

import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { MIN_TICK_SPACING_PX } from "../_constants";
import { formatAxisTick, getAxisTicks, timeToPixel } from "../_utils";
import type { TimeViewport } from "../types";

export type AxisTicksProps = {
    range: TimeViewport;
    pixelWidth: number;
    /** Which side of the ribbon this axis sits on - flips the tick-mark/label so it still "points" toward the ribbon. @default "below" */
    position?: "above" | "below";
};

export function AxisTicks(props: AxisTicksProps): React.ReactNode {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const labelRefs = React.useRef(new Map<number, HTMLSpanElement>());
    const [labelLeftOverrides, setLabelLeftOverrides] = React.useState(new Map<number, number>());

    const durationMs = props.range.end.getTime() - props.range.start.getTime();
    const ticks = React.useMemo(
        () => getAxisTicks(props.range, props.pixelWidth, MIN_TICK_SPACING_PX),
        [props.range, props.pixelWidth],
    );
    const isAbove = props.position === "above";

    // Labels default to being centered on their tick, but a centered label near either edge can
    // still overflow past the container - measuring each label's actual rendered width (only known
    // once mounted) and clamping its left offset to [0, containerWidth - labelWidth] keeps every
    // label fully inside the ribbon's width, not just the first/last one.
    React.useLayoutEffect(
        function clampLabelsWithinContainer() {
            const containerWidth = containerRef.current?.getBoundingClientRect().width;
            if (!containerWidth) return;

            const next = new Map<number, number>();
            for (const tick of ticks) {
                const el = labelRefs.current.get(tick.getTime());
                if (!el) continue;
                const labelWidth = el.getBoundingClientRect().width;
                const naturalLeft = timeToPixel(tick, props.range, props.pixelWidth) - labelWidth / 2;
                next.set(tick.getTime(), Math.max(0, Math.min(naturalLeft, containerWidth - labelWidth)));
            }
            setLabelLeftOverrides(next);
        },
        [ticks, props.range, props.pixelWidth],
    );

    return (
        <div ref={containerRef} className="relative h-4 w-full select-none">
            {ticks.map((tick) => {
                const tickPixel = timeToPixel(tick, props.range, props.pixelWidth);
                return (
                    <React.Fragment key={tick.getTime()}>
                        <div
                            className={resolveClassNames("border-neutral-subtle absolute h-1 border-l", isAbove ? "bottom-0" : "top-0")}
                            style={{ left: tickPixel }}
                        />
                        <span
                            ref={(el) => {
                                if (el) labelRefs.current.set(tick.getTime(), el);
                                else labelRefs.current.delete(tick.getTime());
                            }}
                            className={resolveClassNames(
                                "text-neutral-subtle text-body-xs absolute whitespace-nowrap",
                                isAbove ? "bottom-1" : "top-1",
                            )}
                            style={{ left: labelLeftOverrides.get(tick.getTime()) ?? tickPixel }}
                        >
                            {formatAxisTick(tick, durationMs)}
                        </span>
                    </React.Fragment>
                );
            })}
        </div>
    );
}
