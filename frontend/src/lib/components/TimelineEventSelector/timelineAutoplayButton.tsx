import type React from "react";

import { Pause, PlayArrow } from "@mui/icons-material";

import { Button } from "@lib/components/Button";

import type { SelectableSize } from "../_shared/utils/size";

export type TimelineAutoplayButtonProps = {
    isPlaying: boolean;
    onToggle: () => void;
    disabled?: boolean;
    size?: SelectableSize;
};

/** A ready-made play/pause toggle button for `useTimelineAutoplay` - matches `TimelineEventSelector`'s own nav-button styling. */
export function TimelineAutoplayButton(props: TimelineAutoplayButtonProps): React.ReactNode {
    return (
        <Button
            variant="ghost"
            tone="neutral"
            size={props.size}
            iconOnly
            disabled={props.disabled}
            onClick={props.onToggle}
            aria-label={props.isPlaying ? "Pause" : "Play"}
        >
            {props.isPlaying ? <Pause fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
        </Button>
    );
}
