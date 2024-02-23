import React from "react";

import { GuiEvent, GuiEventPayloads, GuiMessageBroker } from "@framework/GuiMessageBroker";
import {
    MANHATTAN_LENGTH,
    Point2D,
    pointDistance,
    pointRelativeToDomRect,
    pointSubtraction,
    pointerEventToPoint,
} from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type NewModuleDragPreviewProps = {
    moduleTitle: string;
    guiMessageBroker: GuiMessageBroker;
    layoutDivRect: DOMRect | null;
};

export const NewModuleDragPreview: React.FC<NewModuleDragPreviewProps> = (props) => {
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 20, y: 0 });

    React.useEffect(
        function makeDragHandlers() {
            let pointerDownPoint: Point2D | null = null;
            let dragging = false;

            function handleStartCloneDrag(e: GuiEventPayloads[GuiEvent.StartDragClonedModule]) {
                pointerDownPoint = e.pointerPosition;
                addDraggingEventListeners();
            }

            function handlePointerUp() {
                if (!pointerDownPoint) {
                    return;
                }
                pointerDownPoint = null;
                dragging = false;
                setIsDragged(false);

                removeDraggingEventListeners();
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPoint) {
                    return;
                }

                if (!dragging && pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH) {
                    dragging = true;
                    setIsDragged(true);
                    return;
                }

                if (dragging && props.layoutDivRect) {
                    setDragPosition(pointSubtraction(pointerEventToPoint(e), props.layoutDivRect));
                }
            }

            function addDraggingEventListeners() {
                document.addEventListener("pointerup", handlePointerUp);
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointercancel", handlePointerUp);
                document.addEventListener("blur", handlePointerUp);
            }

            function removeDraggingEventListeners() {
                document.removeEventListener("pointerup", handlePointerUp);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointercancel", handlePointerUp);
                document.removeEventListener("blur", handlePointerUp);
            }

            const unsubscribeFunc = props.guiMessageBroker.subscribeToEvent(
                GuiEvent.StartDragClonedModule,
                handleStartCloneDrag
            );

            return () => {
                unsubscribeFunc();
                removeDraggingEventListeners();
            };
        },
        [props.guiMessageBroker, setDragPosition, setIsDragged, props.layoutDivRect]
    );

    return (
        <div
            className={resolveClassNames(
                `absolute w-40 h-40 cursor-grabbing border box-border border-slate-300 border-solid text-sm text-gray-700 hover:shadow-md z-50`,
                {
                    "cursor-grabbing": isDragged,
                    "cursor-grab": !isDragged,
                    hidden: !isDragged,
                }
            )}
            style={{
                left: dragPosition.x,
                top: dragPosition.y,
            }}
        >
            <div className="bg-slate-100 p-2 flex items-center text-xs font-bold shadow">
                <span className="flex-grow">{props.moduleTitle}</span>
            </div>
        </div>
    );
};

NewModuleDragPreview.displayName = "NewModuleDragPreview";
