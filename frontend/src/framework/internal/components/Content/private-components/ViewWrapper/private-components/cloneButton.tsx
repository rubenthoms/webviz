import React from "react";

import { GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import {
    MANHATTAN_LENGTH,
    Point2D,
    Size2D,
    pointDistance,
    pointRelativeToDomRect,
    pointSubtraction,
    pointerEventToPoint,
} from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ContentCopy } from "@mui/icons-material";

const makeStyle = (isDragged: boolean, dragPosition: Point2D): React.CSSProperties => {
    if (isDragged) {
        return {
            left: dragPosition.x,
            top: dragPosition.y,
            zIndex: 100,
            opacity: 0.5,
        };
    }
    return {
        zIndex: 0,
        opacity: 1,
    };
};

export type CloneButtonProps = {
    moduleInstanceId: string;
    moduleName: string;
    guiMessageBroker: GuiMessageBroker;
};

export function CloneButton(props: CloneButtonProps): JSX.Element {
    function handleCloneButtonPointerDown(e: React.PointerEvent) {
        props.guiMessageBroker.publishEvent(GuiEvent.StartDragClonedModule, {
            moduleInstanceId: props.moduleInstanceId,
            moduleName: props.moduleName,
            pointerPosition: pointerEventToPoint(e.nativeEvent),
        });
        e.stopPropagation();
    }

    return (
        <div
            className="hover:text-slate-500 cursor-grab p-1"
            onPointerDown={handleCloneButtonPointerDown}
            title="Drag to clone this module"
        >
            <ContentCopy fontSize="small" />
        </div>
    );
}
