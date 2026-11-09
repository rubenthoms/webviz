import React from "react";

import { Help } from "@mui/icons-material";

import {
    endNewModuleDrag,
    startNewModuleDrag,
} from "@framework/internal/components/Content/private-components/dockviewLayout/dragAndDrop";
import type { ModuleDevState } from "@framework/Module";
import type { DrawPreviewFunc } from "@framework/Preview";
import { Button } from "@lib/components/Button";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { DevStateIcon, ICON_SIZE_PX, PersistenceIcon } from "./moduleIcons";
import { PreviewImage } from "./previewImage";

export type ModulesListItemProps = {
    name: string;
    devState: ModuleDevState;
    displayName: string;
    description: string | null;
    isSerializable: boolean;
    drawPreviewFunc: DrawPreviewFunc | null;
    onShowDetails: (moduleName: string) => void;
    onHover: (moduleName: string, ref: React.RefObject<HTMLDivElement>) => void;
    onDraggingStart: () => void;
};

export function ModulesListItem(props: ModulesListItemProps): React.ReactNode {
    const ref = React.useRef<HTMLDivElement>(null);
    const [isDragged, setIsDragged] = React.useState<boolean>(false);

    function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
        startNewModuleDrag(e, props.name);
        setIsDragged(true);
        props.onDraggingStart();
    }

    function handleDragEnd() {
        endNewModuleDrag();
        setIsDragged(false);
    }

    function handleShowDetails() {
        props.onShowDetails(props.name);
    }

    function handleHover() {
        props.onHover(props.name, ref);
    }

    return (
        <div
            ref={ref}
            title={props.displayName}
            className={resolveClassNames("hover:bg-accent text-body-md flex h-12 w-full flex-col select-none", {
                "cursor-grab": !isDragged,
                "bg-accent-canvas opacity-50": isDragged,
            })}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onMouseOver={handleHover}
        >
            <div className="px-xs gap-x-xs text-body-sm flex h-full items-center">
                <div className="border-neutral-subtle bg-canvas h-10 w-10 min-w-10 shrink-0 overflow-hidden border">
                    <PreviewImage size={40} drawPreviewFunc={props.drawPreviewFunc} />
                </div>
                <span className="grow overflow-hidden text-ellipsis whitespace-nowrap">{props.displayName}</span>

                <DevStateIcon devState={props.devState} />
                <PersistenceIcon isSerializable={props.isSerializable} />

                <Button variant="ghost" tone="accent" size="small" iconOnly onClick={handleShowDetails}>
                    <Help style={{ fontSize: ICON_SIZE_PX }} />
                </Button>
            </div>
        </div>
    );
}
