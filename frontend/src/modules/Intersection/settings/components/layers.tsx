import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, Point2D, pointDistance, rectContainsPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    LayerActionType,
    LayerActions,
    LayerType,
} from "@modules/Intersection/typesAndEnums";
import {
    BaseLayer,
    LayerStatus,
    useIsLayerVisible,
    useLayerStatus,
} from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    ArrowDropDown,
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

import { useAtomValue, useSetAtom } from "jotai";

import { GridLayerSettingsComponent } from "./layerSettings/gridLayer";
import { SeismicLayerSettingsComponent } from "./layerSettings/seismicLayer";
import { SurfaceLayerSettingsComponent } from "./layerSettings/surfaceLayer";
import { WellpicksLayerSettingsComponent } from "./layerSettings/wellpicksLayer";

import { layersAtom } from "../atoms/layersAtoms";

export type LayersProps = {
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function Layers(props: LayersProps): React.ReactNode {
    const dispatch = useSetAtom(layersAtom);
    const layers = useAtomValue(layersAtom);

    const [draggingLayerId, setDraggingLayerId] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Point2D>({ x: 0, y: 0 });

    const parentDivRef = React.useRef<HTMLDivElement>(null);

    function handleAddLayer(type: LayerType) {
        dispatch({ type: LayerActionType.ADD_LAYER, payload: { type } });
    }

    function handleRemoveLayer(id: string) {
        dispatch({ type: LayerActionType.REMOVE_LAYER, payload: { id } });
    }

    React.useEffect(
        function handleMount() {
            if (parentDivRef.current === null) {
                return;
            }

            const currentParentDivRef = parentDivRef.current;

            let pointerDownPosition: Point2D | null = null;
            let pointerDownPositionRelativeToElement: Point2D = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let layerId: string | null = null;

            function findLayerElement(element: HTMLElement): [HTMLElement | null, string | null] {
                if (element?.parentElement && element.dataset.layerId) {
                    return [element.parentElement, element.dataset.layerId];
                }
                return [null, null];
            }

            function handlePointerDown(e: PointerEvent) {
                const [element, id] = findLayerElement(e.target as HTMLElement);

                if (!element || !id) {
                    return;
                }

                draggingActive = false;
                setIsDragging(true);
                layerId = id;
                pointerDownPosition = { x: e.clientX, y: e.clientY };
                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);
            }

            function handleElementDrag(id: string, position: Point2D) {
                if (parentDivRef.current === null) {
                    return;
                }

                const boundingClientRect = parentDivRef.current.getBoundingClientRect();
                if (!rectContainsPoint(boundingClientRect, position)) {
                    return;
                }

                let index = 0;
                for (const child of parentDivRef.current.childNodes) {
                    if (child instanceof HTMLElement) {
                        const childBoundingRect = child.getBoundingClientRect();

                        if (!child.dataset.layerId) {
                            continue;
                        }

                        if (child.dataset.layerId === id) {
                            continue;
                        }

                        if (!rectContainsPoint(childBoundingRect, position)) {
                            index++;
                            continue;
                        }

                        if (position.y <= childBoundingRect.y + childBoundingRect.height / 2) {
                            dispatch({ type: LayerActionType.MOVE_LAYER, payload: { id, moveToIndex: index } });
                        } else {
                            dispatch({ type: LayerActionType.MOVE_LAYER, payload: { id, moveToIndex: index + 1 } });
                        }
                        index++;
                    }
                }
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !layerId) {
                    return;
                }

                if (
                    !draggingActive &&
                    pointDistance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    draggingActive = true;
                    setDraggingLayerId(layerId);
                }

                if (!draggingActive) {
                    return;
                }

                const dx = e.clientX - pointerDownPositionRelativeToElement.x;
                const dy = e.clientY - pointerDownPositionRelativeToElement.y;
                setDragPosition({ x: dx, y: dy });

                handleElementDrag(layerId, { x: e.clientX, y: e.clientY });
            }

            function handlePointerUp() {
                draggingActive = false;
                pointerDownPosition = null;
                layerId = null;
                setIsDragging(false);
                setDraggingLayerId(null);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
            }

            currentParentDivRef.addEventListener("pointerdown", handlePointerDown);

            return function handleUnmount() {
                currentParentDivRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                setIsDragging(false);
                setDraggingLayerId(null);
            };
        },
        [dispatch]
    );

    return (
        <div className="w-full h-full">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300">
                <div className="flex-grow font-bold text-sm">Layers</div>
                <Dropdown>
                    <MenuButton>
                        <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2">
                            <Add fontSize="inherit" />
                            <span>Add layer</span>
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </MenuButton>
                    <Menu anchorOrigin="bottom-end" className="text-sm p-1">
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
            {isDragging &&
                createPortal(
                    <div className="absolute z-40 transparent w-screen h-screen inset-0 cursor-grabbing select-none"></div>
                )}
            <div className="flex flex-col border border-slate-100 relative" ref={parentDivRef}>
                {layers.map((layer) => {
                    return (
                        <LayerItem
                            key={layer.getId()}
                            layer={layer}
                            ensembleSet={props.ensembleSet}
                            workbenchSession={props.workbenchSession}
                            workbenchSettings={props.workbenchSettings}
                            onRemoveLayer={handleRemoveLayer}
                            dispatch={dispatch}
                            isDragging={draggingLayerId === layer.getId()}
                            dragPosition={dragPosition}
                        />
                    );
                })}
                {layers.length === 0 && (
                    <div className="flex p-4 text-sm items-center gap-1 border-b border-b-gray-300">
                        Click on <Add fontSize="inherit" /> to add a layer.
                    </div>
                )}
            </div>
        </div>
    );
}

type LayerItemProps = {
    layer: BaseLayer<any, any>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    isDragging: boolean;
    dragPosition: Point2D;
    onRemoveLayer: (id: string) => void;
    dispatch: (action: LayerActions) => void;
};

function LayerItem(props: LayerItemProps): React.ReactNode {
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

    function makeSettingsContainer(layer: BaseLayer<any, any>): React.ReactNode {
        if (isGridLayer(layer)) {
            return (
                <GridLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer as GridLayer}
                />
            );
        }
        if (isSeismicLayer(layer)) {
            return (
                <SeismicLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer as SeismicLayer}
                />
            );
        }
        if (isSurfaceLayer(layer)) {
            return (
                <SurfaceLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        if (isWellpicksLayer(layer)) {
            return (
                <WellpicksLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layer={layer}
                />
            );
        }
        return null;
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
            return (
                <div title="Error while loading">
                    <Error fontSize="inherit" className="text-red-700" />
                </div>
            );
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
                    data-layer-id={props.layer.getId()}
                    ref={indicatorRef}
                >
                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                </div>
                <div
                    className={resolveClassNames("px-0.5 hover:cursor-pointer rounded", {
                        "hover:bg-blue-100": !props.isDragging,
                    })}
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
            </>
        );
    }

    return (
        <>
            <div
                ref={divRef}
                className={resolveClassNames(
                    "flex h-10 px-1 hover:bg-blue-100 text-sm items-center gap-1 border-b border-b-gray-300 relative"
                )}
                data-layer-id={props.layer.getId()}
            >
                <div
                    className={resolveClassNames("bg-red-300 z-10 w-full h-full absolute left-0 top-0", {
                        hidden: !props.isDragging,
                    })}
                ></div>
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
                {makeSettingsContainer(props.layer)}
            </div>
        </>
    );
}
