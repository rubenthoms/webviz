import React, { useId } from "react";

import { Layer, PickingInfo } from "@deck.gl/core/typed";
import { ColumnLayer, SolidPolygonLayer } from "@deck.gl/layers/typed";
import { IntersectionPolyline, IntersectionPolylineWithoutId } from "@framework/userCreatedItems/IntersectionPolylines";
import { Button } from "@lib/components/Button";
import { ButtonProps } from "@lib/components/Button/button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { IconButton } from "@lib/components/IconButton";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { Select, SelectOption } from "@lib/components/Select";
import {
    Add,
    ArrowBack,
    ArrowDownward,
    ArrowForward,
    ArrowUpward,
    Delete,
    FilterCenterFocus,
    Polyline,
    Remove,
    Save,
} from "@mui/icons-material";
import { SubsurfaceViewerProps, ViewStateType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer, { MapMouseEvent, colorTablesArray } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { isEqual } from "lodash";

export type BoundingBox3D = {
    xmin: number;
    ymin: number;
    zmin: number;
    xmax: number;
    ymax: number;
    zmax: number;
};

export type BoundingBox2D = {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
};

export type SubsurfaceViewerWrapperProps = {
    ref?: React.ForwardedRef<HTMLDivElement>;
    boundingBox: BoundingBox2D | BoundingBox3D;
    layers: Layer[];
    show3D?: boolean;
    colorTables: colorTablesArray;
    enableIntersectionPolylineEditing?: boolean;
    onAddIntersectionPolyline?: (intersectionPolyline: IntersectionPolylineWithoutId) => void;
    onIntersectionPolylineChange?: (intersectionPolyline: IntersectionPolyline) => void;
    onIntersectionPolylineEditCancel?: () => void;
    intersectionPolyline?: IntersectionPolyline;
};

type IntersectionZValues = {
    zMid: number;
    zExtension: number;
};

export function SubsurfaceViewerWrapper(props: SubsurfaceViewerWrapperProps): React.ReactNode {
    const subsurfaceViewerId = useId();

    const [intersectionZValues, setIntersectionZValues] = React.useState<IntersectionZValues | undefined>(undefined);
    const [polylineEditPointsModusActive, setPolylineEditPointsModusActive] = React.useState<boolean>(false);
    const [polylineEditingActive, setPolylineEditingActive] = React.useState<boolean>(false);
    const [currentlyEditedPolyline, setCurrentlyEditedPolyline] = React.useState<number[][]>([]);
    const [selectedPolylinePointIndex, setSelectedPolylinePointIndex] = React.useState<number | null>(null);
    const [hoveredPolylinePointIndex, setHoveredPolylinePointIndex] = React.useState<number | null>(null);
    const [userCameraInteractionActive, setUserCameraInteractionActive] = React.useState<boolean>(true);
    const [hoverPreviewPoint, setHoverPreviewPoint] = React.useState<number[] | null>(null);
    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [verticalScale, setVerticalScale] = React.useState<number>(1);

    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox2D | BoundingBox3D | undefined>(undefined);
    const [prevIntersectionPolyline, setPrevIntersectionPolyline] = React.useState<IntersectionPolyline | undefined>(
        undefined
    );

    const internalRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle<HTMLDivElement | null, HTMLDivElement | null>(props.ref, () => internalRef.current);

    if (!isEqual(props.boundingBox, prevBoundingBox)) {
        setPrevBoundingBox(props.boundingBox);
        let zMid = 0;
        let zExtension = 10;
        if ("zmin" in props.boundingBox && "zmax" in props.boundingBox) {
            zMid = -(props.boundingBox.zmin + (props.boundingBox.zmax - props.boundingBox.zmin) / 2);
            zExtension = Math.abs(props.boundingBox.zmax - props.boundingBox.zmin) + 100;
        }
        setIntersectionZValues({
            zMid,
            zExtension,
        });
    }

    if (!isEqual(props.intersectionPolyline, prevIntersectionPolyline)) {
        setPrevIntersectionPolyline(props.intersectionPolyline);
        if (props.intersectionPolyline) {
            setCurrentlyEditedPolyline(props.intersectionPolyline.points);
            setPolylineEditingActive(true);
            setPolylineEditPointsModusActive(true);
            setSelectedPolylinePointIndex(0);
        } else {
            setPolylineEditingActive(false);
            setPolylineEditPointsModusActive(false);
            setCurrentlyEditedPolyline([]);
            setSelectedPolylinePointIndex(null);
        }
    }

    const layers: Layer[] = [];
    const layerIds: string[] = [];

    if (props.layers) {
        layers.push(...props.layers);
        layerIds.push(...props.layers.map((layer) => layer.id));
    }

    if (props.enableIntersectionPolylineEditing && polylineEditingActive) {
        const zMid = intersectionZValues?.zMid || 0;
        const zExtension = intersectionZValues?.zExtension || 10;

        const currentlyEditedPolylineData = makePolylineData(
            currentlyEditedPolyline,
            zMid,
            zExtension,
            selectedPolylinePointIndex,
            hoveredPolylinePointIndex,
            [255, 255, 255, 255]
        );

        const userPolylinePolygonsData = currentlyEditedPolylineData.polygonData;
        const userPolylineColumnsData = currentlyEditedPolylineData.columnData;

        const userPolylineLineLayer = new SolidPolygonLayer({
            id: "user-polyline-line-layer",
            data: userPolylinePolygonsData,
            getPolygon: (d) => d.polygon,
            getFillColor: (d) => d.color,
            getElevation: zExtension,
            getLineColor: [255, 255, 255],
            getLineWidth: 20,
            lineWidthMinPixels: 1,
            extruded: true,
        });
        layers.push(userPolylineLineLayer);
        layerIds.push(userPolylineLineLayer.id);

        function handleHover(pickingInfo: PickingInfo): void {
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (pickingInfo.object && pickingInfo.object.index < currentlyEditedPolyline.length) {
                setHoveredPolylinePointIndex(pickingInfo.object.index);
            } else {
                setHoveredPolylinePointIndex(null);
            }
        }

        function handleClick(pickingInfo: PickingInfo, event: any): void {
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (pickingInfo.object && pickingInfo.object.index < currentlyEditedPolyline.length) {
                setSelectedPolylinePointIndex(pickingInfo.object.index);
                event.stopPropagation();
                event.handled = true;
            } else {
                setSelectedPolylinePointIndex(null);
            }
        }

        function handleDragStart(pickingInfo: PickingInfo): void {
            setHoverPreviewPoint(null);
            setIsDragging(true);
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (pickingInfo.object && selectedPolylinePointIndex === pickingInfo.object.index) {
                setUserCameraInteractionActive(false);
            }
        }

        function handleDragEnd(): void {
            setIsDragging(false);
            setUserCameraInteractionActive(true);
        }

        function handleDrag(pickingInfo: PickingInfo): void {
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (pickingInfo.object) {
                const index = pickingInfo.object.index;
                if (!pickingInfo.coordinate) {
                    return;
                }
                setCurrentlyEditedPolyline((prev) => {
                    const newPolyline = prev.reduce((acc, point, i) => {
                        if (i === index && pickingInfo.coordinate) {
                            return [...acc, [pickingInfo.coordinate[0], pickingInfo.coordinate[1]]];
                        }
                        return [...acc, point];
                    }, [] as number[][]);

                    if (props.onIntersectionPolylineChange) {
                        // props.onIntersectionPolylineChange(newPolyline);
                    }
                    return newPolyline;
                });
            }
        }

        const userPolylinePointLayer = new ColumnLayer({
            id: "user-polyline-point-layer",
            data: userPolylineColumnsData,
            getElevation: zExtension,
            getPosition: (d) => d.centroid,
            getFillColor: (d) => d.color,
            extruded: true,
            radius: 50,
            radiusUnits: "pixels",
            pickable: true,
            onHover: handleHover,
            onClick: handleClick,
            onDragStart: handleDragStart,
            onDragEnd: handleDragEnd,
            onDrag: handleDrag,
        });
        layers.push(userPolylinePointLayer);
        layerIds.push(userPolylinePointLayer.id);

        const previewData: { centroid: number[]; color: [number, number, number, number] }[] = [];
        if (hoverPreviewPoint) {
            previewData.push({
                centroid: hoverPreviewPoint,
                color: [255, 255, 255, 100],
            });
        }

        const userPolylineHoverPointLayer = new ColumnLayer({
            id: "user-polyline-hover-point-layer",
            data: previewData,
            getElevation: zExtension,
            getPosition: (d) => d.centroid,
            getFillColor: (d) => d.color,
            extruded: true,
            radius: 50,
            radiusUnits: "pixels",
            pickable: true,
        });
        layers.push(userPolylineHoverPointLayer);
        layerIds.push(userPolylineHoverPointLayer.id);
    }

    function handleMouseClick(event: MapMouseEvent): void {
        if (!polylineEditPointsModusActive) {
            return;
        }

        if (!event.x || !event.y) {
            return;
        }

        // Do not create new polyline point when clicking on an already existing point
        for (const info of event.infos) {
            if ("layer" in info && info.layer?.id === "user-polyline-point-layer") {
                if (info.picked) {
                    return;
                }
            }
        }

        const newPoint = [event.x, event.y];
        setCurrentlyEditedPolyline((prev) => {
            let newPolyline: number[][] = [];
            if (selectedPolylinePointIndex === null || selectedPolylinePointIndex === prev.length - 1) {
                newPolyline = [...prev, newPoint];
                setSelectedPolylinePointIndex(prev.length);
            } else if (selectedPolylinePointIndex === 0) {
                newPolyline = [newPoint, ...prev];
                setSelectedPolylinePointIndex(0);
            } else {
                newPolyline = prev;
            }
            return newPolyline;
        });

        setHoverPreviewPoint(null);
    }

    function handleMouseHover(event: MapMouseEvent): void {
        if (!polylineEditPointsModusActive) {
            setHoverPreviewPoint(null);
            return;
        }

        if (event.x === undefined || event.y === undefined) {
            setHoverPreviewPoint(null);
            return;
        }

        if (
            selectedPolylinePointIndex !== null &&
            selectedPolylinePointIndex !== 0 &&
            selectedPolylinePointIndex !== currentlyEditedPolyline.length - 1
        ) {
            setHoverPreviewPoint(null);
            return;
        }

        setHoverPreviewPoint([event.x, event.y, intersectionZValues?.zMid ?? 0]);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "click") {
            handleMouseClick(event);
            return;
        }
        if (event.type === "hover") {
            handleMouseHover(event);
            return;
        }
    }

    function handlePolylineEditingCancel(): void {
        setPolylineEditingActive(false);
        setPolylineEditPointsModusActive(false);
        setCurrentlyEditedPolyline([]);
        setSelectedPolylinePointIndex(null);
        if (props.onIntersectionPolylineEditCancel) {
            props.onIntersectionPolylineEditCancel();
        }
    }

    function handlePolylineEditingFinish(name: string): void {
        if (props.intersectionPolyline) {
            if (props.onIntersectionPolylineChange && currentlyEditedPolyline.length > 1) {
                props.onIntersectionPolylineChange({
                    ...props.intersectionPolyline,
                    name,
                    points: currentlyEditedPolyline,
                });
            }
        } else {
            if (props.onAddIntersectionPolyline && currentlyEditedPolyline.length > 1) {
                props.onAddIntersectionPolyline({
                    name,
                    points: currentlyEditedPolyline,
                });
            }
            handlePolylineEditingCancel();
        }
    }

    const handleDeleteCurrentlySelectedPoint = React.useCallback(function handleDeleteCurrentlySelectedPoint() {
        if (selectedPolylinePointIndex !== null) {
            setSelectedPolylinePointIndex((prev) => (prev === null || prev === 0 ? null : prev - 1));
            setCurrentlyEditedPolyline((prev) => {
                const newPolyline = prev.filter((_, i) => i !== selectedPolylinePointIndex);
                return newPolyline;
            });
        }
    }, []);

    React.useEffect(() => {
        function handleKeyboardEvent(event: KeyboardEvent) {
            if (!polylineEditPointsModusActive) {
                return;
            }
            if (event.key === "Delete" && selectedPolylinePointIndex !== null) {
                handleDeleteCurrentlySelectedPoint();
            }
        }

        document.addEventListener("keydown", handleKeyboardEvent);

        return () => {
            document.removeEventListener("keydown", handleKeyboardEvent);
        };
    }, [selectedPolylinePointIndex, polylineEditPointsModusActive, handleDeleteCurrentlySelectedPoint]);

    function handleAddPolyline(): void {
        setPolylineEditingActive(true);
        handleFocusTopViewClick();
        setPolylineEditPointsModusActive(true);
        setCurrentlyEditedPolyline([]);
        setSelectedPolylinePointIndex(null);
    }

    function handlePolylineEditingModusChange(active: boolean): void {
        setPolylineEditPointsModusActive(active);
    }

    function handleFocusTopViewClick(): void {
        const targetX = (props.boundingBox.xmin + props.boundingBox.xmax) / 2;
        const targetY = (props.boundingBox.ymin + props.boundingBox.ymax) / 2;
        const targetZ = intersectionZValues?.zMid ?? 0;

        setCameraPositionSetByAction({
            rotationOrbit: 0,
            rotationX: 90,
            target: [targetX, targetY, targetZ],
            zoom: NaN,
        });
    }

    function handleVerticalScaleIncrease(): void {
        setVerticalScale((prev) => prev + 0.1);
    }

    function handleVerticalScaleDecrease(): void {
        setVerticalScale((prev) => Math.max(0.1, prev - 0.1));
    }

    function makeTooltip(pickingInfo: PickingInfo): string | null {
        if (!polylineEditPointsModusActive) {
            return null;
        }

        if (isDragging) {
            return null;
        }

        if (
            selectedPolylinePointIndex !== null &&
            selectedPolylinePointIndex !== 0 &&
            selectedPolylinePointIndex !== currentlyEditedPolyline.length - 1
        ) {
            return null;
        }

        if (!pickingInfo.coordinate) {
            return null;
        }

        return `x: ${pickingInfo.coordinate[0].toFixed(2)}, y: ${pickingInfo.coordinate[1].toFixed(2)}`;
    }

    function makeHelperText(): React.ReactNode {
        if (!props.enableIntersectionPolylineEditing) {
            return null;
        }

        if (!polylineEditPointsModusActive) {
            return null;
        }

        let nodes: React.ReactNode[] = [];

        if (selectedPolylinePointIndex === null) {
            nodes.push("Click on map to add first point to polyline");
        } else if (selectedPolylinePointIndex === currentlyEditedPolyline.length - 1) {
            nodes.push(<div>Click on map to add new point to end of polyline</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        } else if (selectedPolylinePointIndex === 0) {
            nodes.push(<div>Click on map to add new point to start of polyline</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        } else {
            nodes.push(<div>Select either end of polyline to add new point</div>);
            nodes.push(
                <div>
                    Press <KeyboardButton text="Delete" /> to remove selected point
                </div>
            );
        }

        return nodes;
    }

    return (
        <div ref={internalRef} className="w-full h-full relative overflow-hidden">
            <SubsurfaceViewerToolbar
                visible={
                    props.intersectionPolyline === undefined &&
                    !polylineEditingActive &&
                    props.enableIntersectionPolylineEditing !== undefined
                }
                onAddPolyline={handleAddPolyline}
                onFocusTopView={handleFocusTopViewClick}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
                zFactor={verticalScale}
            />
            {props.enableIntersectionPolylineEditing && polylineEditingActive && (
                <PolylineEditingPanel
                    currentlyEditedPolyline={currentlyEditedPolyline}
                    currentlyEditedPolylineName={props.intersectionPolyline?.name}
                    selectedPolylineIndex={selectedPolylinePointIndex}
                    hoveredPolylineIndex={hoveredPolylinePointIndex}
                    onPolylinePointSelectionChange={setSelectedPolylinePointIndex}
                    onEditingCancel={handlePolylineEditingCancel}
                    onEditingFinish={handlePolylineEditingFinish}
                    onDeleteCurrentlySelectedPoint={handleDeleteCurrentlySelectedPoint}
                    onPolylineEditingModusChange={handlePolylineEditingModusChange}
                />
            )}
            <SubsurfaceViewerWithCameraState
                id={subsurfaceViewerId}
                layers={layers}
                coords={{ visible: false }}
                colorTables={props.colorTables}
                onMouseEvent={handleMouseEvent}
                userCameraInteractionActive={userCameraInteractionActive}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                views={{
                    layout: [1, 1],
                    showLabel: false,
                    viewports: [
                        {
                            id: "main",
                            isSync: true,
                            show3D: props.show3D,
                            layerIds,
                        },
                    ],
                }}
                getTooltip={makeTooltip}
                verticalScale={verticalScale}
            />
            <div className="absolute bottom-0 right-0 z-30 bg-white bg-opacity-50 p-2 pointer-events-none">
                {makeHelperText()}
            </div>
        </div>
    );
}

type KeyboardButtonProps = {
    text: string;
};

function KeyboardButton(props: KeyboardButtonProps): React.ReactNode {
    return (
        <span className="bg-gray-200 p-1 m-2 rounded text-sm text-gray-800 border border-gray-400 shadow inline-flex items-center justify-center">
            {props.text}
        </span>
    );
}

type SubsurfaceViewerToolbarProps = {
    visible: boolean;
    zFactor: number;
    onAddPolyline: () => void;
    onFocusTopView: () => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

function SubsurfaceViewerToolbar(props: SubsurfaceViewerToolbarProps): React.ReactNode {
    function handleAddPolylineClick() {
        props.onAddPolyline();
    }

    function handleFocusTopViewClick() {
        props.onFocusTopView();
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    if (!props.visible) {
        return null;
    }

    return (
        <div className="absolute right-0 top-0 bg-white p-1 rounded border-gray-300 border shadow z-30 text-sm flex flex-col gap-1 items-center">
            <Button onClick={handleAddPolylineClick} title="Add new custom intersection polyline">
                <Polyline fontSize="inherit" />
            </Button>
            <Button onClick={handleFocusTopViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToolBarDivider />
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                title="Increase vertical scale"
            >
                <Add fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
            <span title="Vertical scale">{props.zFactor.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </div>
    );
}

function ToolBarDivider(): React.ReactNode {
    return <div className="w-full h-[1px] bg-gray-300" />;
}

type PolylineEditingPanelProps = {
    currentlyEditedPolyline: number[][];
    currentlyEditedPolylineName?: string;
    selectedPolylineIndex: number | null;
    hoveredPolylineIndex: number | null;
    onPolylinePointSelectionChange: (index: number | null) => void;
    onPolylineEditingModusChange: (active: boolean) => void;
    onDeleteCurrentlySelectedPoint: () => void;
    onEditingFinish: (name: string) => void;
    onEditingCancel: () => void;
};

export function PolylineEditingPanel(props: PolylineEditingPanelProps): React.ReactNode {
    const [pointEditingFinished, setPointEditingFinished] = React.useState<boolean>(false);
    const [polylineName, setPolylineName] = React.useState<string>(props.currentlyEditedPolylineName ?? "");

    function handlePolylinePointSelectionChange(values: string[]): void {
        if (values.length === 0) {
            props.onPolylinePointSelectionChange(null);
        } else {
            props.onPolylinePointSelectionChange(parseInt(values[0], 10));
        }
    }

    function handleFinishEditingClick(): void {
        setPointEditingFinished(true);
        props.onPolylineEditingModusChange(false);
    }

    function handleSaveClick(): void {
        setPointEditingFinished(false);
        props.onEditingFinish(polylineName);
        setPolylineName("");
    }

    function handleCancelClick(): void {
        setPointEditingFinished(false);
        setPolylineName("");
        props.onEditingCancel();
    }

    function handleBackClick(): void {
        setPointEditingFinished(false);
        props.onPolylineEditingModusChange(true);
    }

    function handleNameChange(event: React.ChangeEvent<HTMLInputElement>): void {
        setPolylineName(event.target.value);
    }

    function handleDeleteCurrentlySelectedPoint(): void {
        if (props.selectedPolylineIndex !== null) {
            props.onDeleteCurrentlySelectedPoint();
        }
    }

    function makeContent() {
        if (pointEditingFinished) {
            return (
                <Label text="Name">
                    <Input
                        value={polylineName}
                        autoFocus
                        type="text"
                        placeholder="Polyline name"
                        onChange={handleNameChange}
                    />
                </Label>
            );
        }
        return (
            <>
                <div className="flex gap-2">
                    <div className="flex-grow">
                        <Select
                            value={props.selectedPolylineIndex !== null ? [props.selectedPolylineIndex.toString()] : []}
                            options={makeSelectOptionsFromPoints(props.currentlyEditedPolyline)}
                            onChange={handlePolylinePointSelectionChange}
                            size={5}
                            placeholder="Click on map to set first point"
                        />
                    </div>
                    <div className="flex flex-col gap-2 rounded bg-slate-50">
                        <IconButton
                            onClick={handleDeleteCurrentlySelectedPoint}
                            disabled={props.selectedPolylineIndex === null}
                            title="Delete currently selected point"
                        >
                            <Delete fontSize="inherit" />
                        </IconButton>
                    </div>
                </div>
            </>
        );
    }

    function makeButtons() {
        if (pointEditingFinished) {
            return (
                <>
                    <Button onClick={handleCancelClick} color="danger">
                        Cancel
                    </Button>
                    <Button onClick={handleBackClick} startIcon={<ArrowBack fontSize="inherit" />}>
                        Back
                    </Button>
                    <Button onClick={handleSaveClick} color="success" startIcon={<Save fontSize="inherit" />}>
                        Save
                    </Button>
                </>
            );
        }
        return (
            <>
                <Button onClick={handleCancelClick} color="danger">
                    Cancel
                </Button>
                <Button
                    onClick={handleFinishEditingClick}
                    disabled={props.currentlyEditedPolyline.length < 2}
                    endIcon={<ArrowForward fontSize="inherit" />}
                >
                    Continue
                </Button>
            </>
        );
    }

    return (
        <div className="w-64 absolute right-0 top-0 z-30 bg-white rounded shadow border border-gray-300 text-sm opacity-80">
            <div className="bg-slate-300 p-2 font-bold">Polyline editing</div>
            <div className="p-2 h-36">{makeContent()}</div>
            <div className="bg-slate-100 flex items-center justify-between p-1">{makeButtons()}</div>
        </div>
    );
}

function makeStringFromPoint(point: number[]): string {
    return `${point[0].toFixed(2)}, ${point[1].toFixed(2)}`;
}

function makeSelectOptionsFromPoints(points: number[][]): SelectOption[] {
    return points.map((point, index) => ({
        value: index.toString(),
        label: makeStringFromPoint(point),
    }));
}

type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    userCameraInteractionActive?: boolean;
    onCameraPositionApplied?: () => void;
};

function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const [prevBounds, setPrevBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const [prevCameraPosition, setPrevCameraPosition] = React.useState<ViewStateType | undefined>(undefined);
    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(undefined);

    if (!isEqual(props.bounds, prevBounds)) {
        setPrevBounds(props.bounds);
        setCameraPosition(undefined);
    }

    if (!isEqual(props.cameraPosition, prevCameraPosition)) {
        setPrevCameraPosition(props.cameraPosition);
        if (props.cameraPosition) {
            setCameraPosition(props.cameraPosition);
            props.onCameraPositionApplied?.();
        }
    }

    const handleCameraChange = React.useCallback(
        function handleCameraChange(viewport: ViewStateType): void {
            if (props.userCameraInteractionActive || props.userCameraInteractionActive === undefined) {
                console.debug(viewport);
                setCameraPosition(viewport);
            }
        },
        [props.userCameraInteractionActive]
    );

    return <SubsurfaceViewer {...props} cameraPosition={cameraPosition} getCameraPosition={handleCameraChange} />;
}

function makePolylineData(
    polyline: number[][],
    zMid: number,
    zExtension: number,
    selectedPolylineIndex: number | null,
    hoveredPolylineIndex: number | null,
    color: [number, number, number, number]
): {
    polygonData: { polygon: number[][]; color: number[] }[];
    columnData: { index: number; centroid: number[]; color: number[] }[];
} {
    const polygonData: {
        polygon: number[][];
        color: number[];
    }[] = [];

    const columnData: {
        index: number;
        centroid: number[];
        color: number[];
    }[] = [];

    const width = 10;
    for (let i = 0; i < polyline.length; i++) {
        const startPoint = polyline[i];
        const endPoint = polyline[i + 1];

        if (i < polyline.length - 1) {
            const lineVector = [endPoint[0] - startPoint[0], endPoint[1] - startPoint[1], 0];
            const zVector = [0, 0, 1];
            const normalVector = [
                lineVector[1] * zVector[2] - lineVector[2] * zVector[1],
                lineVector[2] * zVector[0] - lineVector[0] * zVector[2],
                lineVector[0] * zVector[1] - lineVector[1] * zVector[0],
            ];
            const normalizedNormalVector = [
                normalVector[0] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
                normalVector[1] / Math.sqrt(normalVector[0] ** 2 + normalVector[1] ** 2 + normalVector[2] ** 2),
            ];

            const point1 = [
                startPoint[0] - (normalizedNormalVector[0] * width) / 2,
                startPoint[1] - (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point2 = [
                endPoint[0] - (normalizedNormalVector[0] * width) / 2,
                endPoint[1] - (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point3 = [
                endPoint[0] + (normalizedNormalVector[0] * width) / 2,
                endPoint[1] + (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const point4 = [
                startPoint[0] + (normalizedNormalVector[0] * width) / 2,
                startPoint[1] + (normalizedNormalVector[1] * width) / 2,
                zMid - zExtension / 2,
            ];

            const polygon: number[][] = [point1, point2, point3, point4];
            polygonData.push({ polygon, color: [color[0], color[1], color[2], color[3] / 2] });
        }

        let adjustedColor = color;
        if (i === selectedPolylineIndex) {
            if (i === 0 || i === polyline.length - 1) {
                adjustedColor = [0, 255, 0, color[3]];
                if (i === hoveredPolylineIndex) {
                    adjustedColor = [200, 255, 200, color[3]];
                }
            } else {
                adjustedColor = [60, 60, 255, color[3]];
                if (i === hoveredPolylineIndex) {
                    adjustedColor = [120, 120, 255, color[3]];
                }
            }
        } else if (i === hoveredPolylineIndex) {
            adjustedColor = [120, 120, 255, color[3]];
        }
        columnData.push({
            index: i,
            centroid: [startPoint[0], startPoint[1], zMid - zExtension / 2],
            color: adjustedColor,
        });
    }

    return { polygonData, columnData };
}
