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
    moduleName: string;
    displayName: string;
    guiMessageBroker: GuiMessageBroker;
};

export function CloneButton(props: CloneButtonProps): JSX.Element {
    const ref = React.useRef<HTMLDivElement>(null);
    const [isDragged, setIsDragged] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 20, y: 0 });

    React.useEffect(() => {
        const refCurrent = ref.current;
        let pointerDownPoint: Point2D | null = null;
        let dragging = false;
        let pointerDownElementPosition: Point2D | null = null;
        let pointerToElementDiff: Point2D = { x: 0, y: 0 };

        const handlePointerDown = (e: PointerEvent) => {
            if (ref.current) {
                const point = pointerEventToPoint(e);
                const rect = ref.current.getBoundingClientRect();
                pointerDownElementPosition = pointSubtraction(point, pointRelativeToDomRect(point, rect));
                props.guiMessageBroker.publishEvent(GuiEvent.NewModulePointerDown, {
                    moduleName: props.moduleName,
                    elementPosition: pointSubtraction(point, pointRelativeToDomRect(point, rect)),
                    elementSize: { width: rect.width, height: rect.height },
                    pointerPosition: point,
                });
                pointerDownPoint = point;
                addDraggingEventListeners();
                e.stopPropagation();
            }
        };

        const handlePointerUp = () => {
            if (!pointerDownPoint) {
                return;
            }
            pointerDownPoint = null;
            dragging = false;
            setIsDragged(false);
            pointerDownElementPosition = null;

            removeDraggingEventListeners();
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownPoint) {
                return;
            }

            if (
                !dragging &&
                pointDistance(pointerEventToPoint(e), pointerDownPoint) > MANHATTAN_LENGTH &&
                pointerDownElementPosition
            ) {
                dragging = true;
                setIsDragged(true);
                pointerToElementDiff = pointSubtraction(pointerDownPoint, pointerDownElementPosition);
                return;
            }

            if (dragging && refCurrent) {
                const rect = refCurrent.getBoundingClientRect();
                if (rect) {
                    setDragPosition(
                        pointSubtraction(pointSubtraction(pointerEventToPoint(e), rect), pointerToElementDiff)
                    );
                }
            }
        };

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

        if (ref.current) {
            ref.current.addEventListener("pointerdown", handlePointerDown);
        }

        return () => {
            if (refCurrent) {
                refCurrent.removeEventListener("pointerdown", handlePointerDown);
            }
            removeDraggingEventListeners();
        };
    }, [props.guiMessageBroker, props.moduleName, setDragPosition, setIsDragged]);

    return (
        <div className="relative">
            <div
                className={resolveClassNames(
                    "absolute w-40 h-40 cursor-grabbing border box-border border-slate-300 border-solid text-sm text-gray-700 hover:shadow-md"
                )}
                style={makeStyle(true, dragPosition)}
            >
                <div className="bg-slate-100 p-2 flex items-center text-xs font-bold shadow">
                    <span className="flex-grow">{props.displayName}</span>
                </div>
            </div>
            <div className="hover:text-slate-500 cursor-grab p-1" title="Drag to clone this module" ref={ref}>
                <ContentCopy fontSize="small" />
            </div>
        </div>
    );
}
