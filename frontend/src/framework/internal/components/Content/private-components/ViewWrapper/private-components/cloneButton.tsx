import React from "react";

import { GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { pointerEventToPoint } from "@lib/utils/geometry";
import { ContentCopy } from "@mui/icons-material";

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
