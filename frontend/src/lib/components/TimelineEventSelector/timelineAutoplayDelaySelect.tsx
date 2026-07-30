import type React from "react";

import { Combobox } from "@lib/components/Combobox";

import type { SelectableSize } from "../_shared/utils/size";

export type TimelineAutoplayDelaySelectProps = {
    delayMs: number;
    onDelayChange: (delayMs: number) => void;
    disabled?: boolean;
    size?: SelectableSize;
};

const DELAY_OPTIONS_MS = [250, 500, 1000, 2000, 3000, 5000, 10000];

function formatDelayLabel(delayMs: number): string {
    if (delayMs < 1000) return `${delayMs} ms`;
    const seconds = delayMs / 1000;
    return `${Number.isInteger(seconds) ? seconds : seconds.toFixed(1)} s`;
}

/** A ready-made delay picker for `useTimelineAutoplay`'s `delayMs` option, with a few reasonable presets. */
export function TimelineAutoplayDelaySelect(props: TimelineAutoplayDelaySelectProps): React.ReactNode {
    return (
        <Combobox
            layoutClassName="w-24"
            size={props.size}
            disabled={props.disabled}
            items={DELAY_OPTIONS_MS.map((delayMs) => ({ value: delayMs, label: formatDelayLabel(delayMs) }))}
            value={props.delayMs}
            onValueChange={(value) => {
                if (value !== null) props.onDelayChange(value);
            }}
        />
    );
}
