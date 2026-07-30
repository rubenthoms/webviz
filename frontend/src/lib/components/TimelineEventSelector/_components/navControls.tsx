import type React from "react";

import { Add, ChevronLeft, ChevronRight, Remove } from "@mui/icons-material";

import { Button } from "@lib/components/Button";

import type { SelectableSize } from "../../_shared/utils/size";

export type NavControlsProps = {
    size?: SelectableSize;
    canGoPrev: boolean;
    canGoNext: boolean;
    disabled?: boolean;
    onPrev: () => void;
    onNext: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
};

export function NavControls(props: NavControlsProps): React.ReactNode {
    return (
        <div className="gap-2xs flex items-center">
            <Button
                variant="ghost"
                tone="neutral"
                size={props.size}
                iconOnly
                disabled={props.disabled || !props.canGoPrev}
                onClick={props.onPrev}
                aria-label="Previous event"
            >
                <ChevronLeft fontSize="inherit" />
            </Button>
            <Button
                variant="ghost"
                tone="neutral"
                size={props.size}
                iconOnly
                disabled={props.disabled || !props.canGoNext}
                onClick={props.onNext}
                aria-label="Next event"
            >
                <ChevronRight fontSize="inherit" />
            </Button>
            <div className="bg-neutral-subtle mx-2xs h-4 w-px" />
            <Button
                variant="ghost"
                tone="neutral"
                size={props.size}
                iconOnly
                disabled={props.disabled}
                onClick={props.onZoomOut}
                aria-label="Zoom out"
            >
                <Remove fontSize="inherit" />
            </Button>
            <Button
                variant="ghost"
                tone="neutral"
                size={props.size}
                iconOnly
                disabled={props.disabled}
                onClick={props.onZoomIn}
                aria-label="Zoom in"
            >
                <Add fontSize="inherit" />
            </Button>
        </div>
    );
}
