import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2 } from "@lib/utils/vec2";
import {
    BaseLayer,
    LayerStatus,
    useIsLayerVisible,
    useLayerName,
    useLayerStatus,
} from "@modules/_shared/layers/BaseLayer";
import {
    Check,
    Delete,
    DragIndicator,
    Error,
    ExpandLess,
    ExpandMore,
    Settings,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { MakeSettingsContainerFunc } from "./layersPanel";

type LayerItemProps = {
    layer: BaseLayer<any, any>;
    inGroup: boolean;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    isDragging: boolean;
    dragPosition: Vec2;
    onRemoveLayer: (id: string) => void;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
};

export function LayerComponent(props: LayerItemProps): React.ReactNode {
    const [showSettings, setShowSettings] = React.useState<boolean>(true);

    const dragIndicatorRef = React.useRef<HTMLDivElement>(null);
    const divRef = React.useRef<HTMLDivElement>(null);

    const boundingClientRect = useElementBoundingRect(divRef);

    const isVisible = useIsLayerVisible(props.layer);
    const status = useLayerStatus(props.layer);

    function handleRemoveLayer() {
        props.onRemoveLayer(props.layer.getId());
    }

    function handleToggleLayerVisibility() {
        props.layer.setIsVisible(!isVisible);
    }

    function handleToggleSettingsVisibility() {
        setShowSettings(!showSettings);
    }

    function makeStatus(): React.ReactNode {
        if (status === LayerStatus.LOADING) {
            return (
                <div title="Loading">
                    <CircularProgress size="extra-small" />
                </div>
            );
        }
        if (status === LayerStatus.ERROR) {
            const error = props.layer.getError();
            if (typeof error === "string") {
                return (
                    <div title={error}>
                        <Error fontSize="inherit" className="text-red-700" />
                    </div>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <div title={statusMessage.message}>
                        <Error fontSize="inherit" className="text-red-700" />
                    </div>
                );
            }
        }
        if (status === LayerStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <Check fontSize="inherit" className="text-green-700" />
                </div>
            );
        }
        return null;
    }

    function makeLayerElement(indicatorRef?: React.LegacyRef<HTMLDivElement>): React.ReactNode {
        return (
            <>
                <div
                    className={resolveClassNames("px-0.5", {
                        "hover:cursor-grab": !props.isDragging,
                        "hover:cursor-grabbing": props.isDragging,
                    })}
                    data-item-id={props.layer.getId()}
                    data-item-type="layer"
                    ref={indicatorRef}
                >
                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                </div>
                <div
                    className={resolveClassNames("px-0.5 hover:cursor-pointer rounded", {
                        "hover:text-blue-800": !props.isDragging,
                    })}
                    onClick={handleToggleLayerVisibility}
                    title="Toggle visibility"
                >
                    {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <LayerName layer={props.layer} />
                {makeStatus()}
                <div
                    className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                    onClick={handleToggleSettingsVisibility}
                    title={showSettings ? "Hide settings" : "Show settings"}
                >
                    <Settings fontSize="inherit" />
                    {showSettings ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={handleRemoveLayer}
                    title="Remove layer"
                >
                    <Delete fontSize="inherit" />
                </div>
            </>
        );
    }

    return (
        <div
            ref={divRef}
            className={resolveClassNames("relative")}
            data-item-id={props.layer.getId()}
            data-item-type="layer"
        >
            <div
                className={resolveClassNames("z-30 w-full h-full absolute left-0 top-0", {
                    "bg-blue-500": !props.inGroup,
                    "bg-blue-300": props.inGroup,
                    hidden: !props.isDragging,
                })}
            ></div>
            <div
                className={resolveClassNames(
                    "flex h-8 py-1 px-1 hover:bg-blue-100 text-sm items-center gap-1 border-b border-b-gray-300 relative",
                    {
                        "bg-red-100": props.layer.getStatus() === LayerStatus.ERROR,
                        "bg-white": props.layer.getStatus() !== LayerStatus.ERROR,
                    }
                )}
            >
                {makeLayerElement(dragIndicatorRef)}
            </div>
            {props.isDragging &&
                createPortal(
                    <div
                        className={resolveClassNames(
                            "flex h-10 px-1 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
                        )}
                        style={{
                            left: props.dragPosition.x,
                            top: props.dragPosition.y,
                            width: props.isDragging ? boundingClientRect.width : undefined,
                        }}
                    >
                        {makeLayerElement()}
                    </div>
                )}
            <div
                className={resolveClassNames("border-b border-b-gray-300 bg-gray-50 shadow-inner", {
                    "overflow-hidden h-[1px]": !showSettings,
                })}
            >
                {props.makeSettingsContainerFunc(
                    props.layer,
                    props.ensembleSet,
                    props.workbenchSession,
                    props.workbenchSettings
                )}
            </div>
        </div>
    );
}

type LayerNameProps = {
    layer: BaseLayer<any, any>;
};

function LayerName(props: LayerNameProps): React.ReactNode {
    const layerName = useLayerName(props.layer);
    const [editingName, setEditingName] = React.useState<boolean>(false);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.layer.setName(e.target.value);
    }

    function handleBlur() {
        setEditingName(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            setEditingName(false);
        }
    }

    return (
        <div
            className="flex-grow font-bold flex items-center pt-1"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to edit name"
        >
            {editingName ? (
                <input
                    type="text"
                    className="p-0.5 w-full"
                    value={layerName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                layerName
            )}
        </div>
    );
}
