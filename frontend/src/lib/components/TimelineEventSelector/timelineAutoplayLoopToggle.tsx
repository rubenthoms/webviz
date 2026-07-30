import type React from "react";

import { Loop } from "@mui/icons-material";

import { Button } from "@lib/components/Button";

import type { SelectableSize } from "../_shared/utils/size";

export type TimelineAutoplayLoopToggleProps = {
    loop: boolean;
    onToggle: () => void;
    disabled?: boolean;
    size?: SelectableSize;
};

/** A ready-made toggle for `useTimelineAutoplay`'s `loop` option - pressed/active styling when looping is on. */
export function TimelineAutoplayLoopToggle(props: TimelineAutoplayLoopToggleProps): React.ReactNode {
    return (
        <Button
            variant="ghost"
            tone="neutral"
            size={props.size}
            iconOnly
            pressed={props.loop}
            disabled={props.disabled}
            onClick={props.onToggle}
            aria-label={props.loop ? "Disable loop" : "Enable loop"}
        >
            <Loop fontSize="inherit" />
        </Button>
    );
}
