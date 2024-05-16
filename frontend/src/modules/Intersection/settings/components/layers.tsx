import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, Point2D, pointDistance } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    Layer,
    LayerActionType,
    LayerActions,
    LayerBoundingBox,
    LayerType,
} from "@modules/Intersection/typesAndEnums";
import {
    BaseLayer,
    LayerStatus,
    useIsLayerVisible,
    useLayerStatus,
} from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, SeismicLayerSettings, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    ArrowDropDown,
    Check,
    Delete,
    DragHandle,
    DragIndicator,
    Error,
    ExpandLess,
    ExpandMore,
    Settings,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { useAtomValue, useSetAtom } from "jotai";

import { GridLayerSettingsComponent } from "./layerSettings/GridLayer/layer";
import { SeismicLayerSettingsComponent } from "./layerSettings/seismicLayer";

import { layersAtom } from "../atoms/layersAtoms";

export type LayersProps = {
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
};

export function Layers(props: LayersProps): React.ReactNode {
    const dispatch = useSetAtom(layersAtom);
    const layers = useAtomValue(layersAtom);

    const parentDivRef = React.useRef<HTMLDivElement>(null);

    function handleAddLayer(type: LayerType) {
        dispatch({ type: LayerActionType.ADD_LAYER, payload: { type } });
    }

    function handleRemoveLayer(id: string) {
        dispatch({ type: LayerActionType.REMOVE_LAYER, payload: { id } });
    }

    return (
        <div className="w-full h-full">
            <div className="flex flex-col border border-slate-100 relative" ref={parentDivRef}>
                {layers.map((layer) => {
                    return (
                        <LayerItem
                            key={layer.getId()}
                            layer={layer}
                            ensembleSet={props.ensembleSet}
                            workbenchSession={props.workbenchSession}
                            onRemoveLayer={handleRemoveLayer}
                            dispatch={dispatch}
                        />
                    );
                })}
            </div>
            <div className="flex bg-slate-100">
                <Dropdown>
                    <MenuButton>
                        <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded">
                            <Add fontSize="inherit" />
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </MenuButton>
                    <Menu anchorOrigin="bottom-start" className="text-sm p-1">
                        {Object.keys(LAYER_TYPE_TO_STRING_MAPPING).map((layerType, index) => {
                            return (
                                <MenuItem
                                    key={index}
                                    className="text-sm p-0.5"
                                    onClick={() => handleAddLayer(layerType as LayerType)}
                                >
                                    {LAYER_TYPE_TO_STRING_MAPPING[layerType as LayerType]}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Dropdown>
            </div>
        </div>
    );
}

type LayerItemProps = {
    layer: BaseLayer<any, any>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    onRemoveLayer: (id: string) => void;
    dispatch: (action: LayerActions) => void;
};

function LayerItem(props: LayerItemProps): React.ReactNode {
    const [showSettings, setShowSettings] = React.useState<boolean>(false);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 0, y: 0 });

    const dragIndicatorRef = React.useRef<HTMLDivElement>(null);
    const divRef = React.useRef<HTMLDivElement>(null);

    const boundingClientRect = useElementBoundingRect(divRef);

    React.useEffect(function handleMount() {
        let pointerDownPosition: Point2D | null = null;
        let pointerDownPositionRelativeToElement: Point2D = { x: 0, y: 0 };
        let draggingActive: boolean = false;

        if (dragIndicatorRef.current === null) {
            return;
        }

        const currentDragIndicatorRef = dragIndicatorRef.current;

        function handlePointerDown(e: PointerEvent) {
            draggingActive = false;
            pointerDownPosition = { x: e.clientX, y: e.clientY };
            pointerDownPositionRelativeToElement = {
                x: e.clientX - currentDragIndicatorRef.getBoundingClientRect().left,
                y: e.clientY - currentDragIndicatorRef.getBoundingClientRect().top,
            };
            document.addEventListener("pointermove", handlePointerMove);
            document.addEventListener("pointerup", handlePointerUp);
        }

        function handlePointerMove(e: PointerEvent) {
            if (!pointerDownPosition) {
                return;
            }

            if (
                !draggingActive &&
                pointDistance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
            ) {
                setIsDragging(true);
                draggingActive = true;
            }

            if (!draggingActive) {
                return;
            }

            const dx = e.clientX - pointerDownPositionRelativeToElement.x;
            const dy = e.clientY - pointerDownPositionRelativeToElement.y;
            setDragPosition({ x: dx, y: dy });
        }

        function handlePointerUp() {
            setIsDragging(false);
            draggingActive = false;
            pointerDownPosition = null;
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        }

        dragIndicatorRef.current.addEventListener("pointerdown", handlePointerDown);

        return function handleUnmount() {
            currentDragIndicatorRef.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("pointermove", handlePointerMove);
            document.removeEventListener("pointerup", handlePointerUp);
        };
    }, []);

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

    function makeSettingsContainer(layer: BaseLayer<any, any>): React.ReactNode {
        if (isGridLayer(layer)) {
            return (
                <GridLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    layer={layer as GridLayer}
                />
            );
        }
        if (isSeismicLayer(layer)) {
            return (
                <SeismicLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    layer={layer as SeismicLayer}
                />
            );
        }
        return null;
    }

    function makeStatus(): React.ReactNode {
        if (status === LayerStatus.LOADING) {
            return <CircularProgress size="extra-small" />;
        }
        if (status === LayerStatus.ERROR) {
            return <Error fontSize="inherit" className="text-red-700" />;
        }
        if (status === LayerStatus.SUCCESS) {
            return <Check fontSize="inherit" className="text-green-700" />;
        }
        return null;
    }

    function makeLayerElement(): React.ReactNode {
        return (
            <div
                key={props.layer.getId()}
                ref={divRef}
                className={resolveClassNames(
                    "flex h-10 px-1 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300",
                    {
                        absolute: isDragging,
                    }
                )}
                style={{
                    left: dragPosition.x,
                    top: dragPosition.y,
                    width: isDragging ? boundingClientRect.width : undefined,
                }}
            >
                <div
                    className={resolveClassNames("px-0.5", {
                        "hover:cursor-grab": !isDragging,
                        "hover:cursor-grabbing": isDragging,
                    })}
                    ref={dragIndicatorRef}
                >
                    <DragIndicator fontSize="inherit" />
                </div>
                <div
                    className="px-0.5 hover:cursor-pointer hover:bg-blue-100 rounded"
                    onClick={handleToggleLayerVisibility}
                    title="Toggle visibility"
                >
                    {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <div className="flex-grow font-bold flex items-center gap-1">{props.layer.getName()}</div>
                {makeStatus()}
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
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
            </div>
        );
    }

    return (
        <>
            {isDragging ? createPortal(makeLayerElement()) : makeLayerElement()}
            {isDragging && (
                <div
                    key={props.layer.getId()}
                    className="bg-red-300 h-10"
                    style={{ left: dragPosition.x, top: dragPosition.y }}
                ></div>
            )}
            <div
                className={resolveClassNames("border-b border-b-gray-300 bg-gray-50 shadow-inner", {
                    "overflow-hidden h-[1px]": !showSettings,
                })}
            >
                {makeSettingsContainer(props.layer)}
            </div>
        </>
    );
}
