import React from "react";

import {
    AxisOptions,
    Controller,
    GeomodelCanvasLayer,
    GeomodelLabelsLayer,
    GeomodelLayerV2,
    GridLayer,
    IntersectionReferenceSystem,
    Layer,
    LayerOptions,
    OnRescaleEvent,
    PixiRenderApplication,
    SurfaceData,
    WellborepathLayer,
    WellborepathLayerOptions,
} from "@equinor/esv-intersection";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { PointerEventsCalculator } from "./PointerEventsCalculator";

export enum LayerType {
    GEOMODEL_CANVAS = "geomodel-canvas",
    GEOMODEL_V2 = "geomodel-v2",
    WELLBORE_PATH = "wellborepath",
    GEOMODEL_LABELS = "geomodel-labels",
}

type LayerDataTypeMap = {
    [LayerType.GEOMODEL_CANVAS]: SurfaceData;
    [LayerType.GEOMODEL_V2]: SurfaceData;
    [LayerType.WELLBORE_PATH]: [number, number][];
    [LayerType.GEOMODEL_LABELS]: SurfaceData;
};

type LayerOptionsMap = {
    [LayerType.GEOMODEL_CANVAS]: LayerOptions<SurfaceData>;
    [LayerType.GEOMODEL_V2]: LayerOptions<SurfaceData>;
    [LayerType.WELLBORE_PATH]: WellborepathLayerOptions<[number, number][]>;
    [LayerType.GEOMODEL_LABELS]: LayerOptions<SurfaceData>;
};

export type LayerOption<T extends keyof LayerOptionsMap> = {
    type: T;
    id: string;
    options: LayerOptionsMap[T];
};

export type EsvIntersectionProps<T extends keyof LayerDataTypeMap> = {
    size?: Size2D;
    showGrid?: boolean;
    axesOptions?: AxisOptions;
    layers?: LayerOption<T>[];
    bounds?: {
        x: [number, number];
        y: [number, number];
    };
    viewport?: [number, number, number];
    intersectionReferenceSystem?: IntersectionReferenceSystem;
};

function makeLayer<T extends keyof LayerDataTypeMap>(
    type: T,
    id: string,
    options: LayerOptionsMap[T],
    pixiRenderApplication: PixiRenderApplication
): Layer<LayerDataTypeMap[T]> {
    switch (type) {
        case LayerType.GEOMODEL_CANVAS:
            return new GeomodelCanvasLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_V2:
            return new GeomodelLayerV2(
                pixiRenderApplication,
                id,
                options as LayerOptions<SurfaceData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.WELLBORE_PATH:
            return new WellborepathLayer(
                id,
                options as WellborepathLayerOptions<[number, number][]>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.GEOMODEL_LABELS:
            return new GeomodelLabelsLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
    }

    throw new Error("Invalid layer type");
}

export function EsvIntersection(props: EsvIntersectionProps<any>): React.ReactNode {
    const [prevShowGrid, setPrevShowGrid] = React.useState<boolean | undefined>(undefined);
    const [prevContainerSize, setPrevContainerSize] = React.useState<Size2D | undefined>(undefined);
    const [prevLayerIds, setPrevLayerIds] = React.useState<string[]>([]);
    const [prevBounds, setPrevBounds] = React.useState<{ x: [number, number]; y: [number, number] } | undefined>(
        undefined
    );
    const [prevViewport, setPrevViewport] = React.useState<[number, number, number] | undefined>(undefined);
    const [prevRevision, setPrevRevision] = React.useState<number>(0);
    const [currentRevision, setCurrentRevision] = React.useState<number>(0);
    const [layers, setLayers] = React.useState<Layer<unknown>[]>([]);

    const esvControllerRef = React.useRef<Controller | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const pixiRenderAppRef = React.useRef<PixiRenderApplication | null>(null);
    const pointerEventsCalculatorRef = React.useRef<PointerEventsCalculator | null>(null);

    const containerSize = useElementSize(containerRef);

    if (esvControllerRef.current && pixiRenderAppRef.current) {
        if (prevShowGrid !== props.showGrid || currentRevision !== prevRevision) {
            if (props.showGrid) {
                esvControllerRef.current.addLayer(new GridLayer("grid"));
            } else {
                esvControllerRef.current.removeLayer("grid");
            }
            setPrevShowGrid(props.showGrid);
        }

        if (!isEqual(prevContainerSize, containerSize) || currentRevision !== prevRevision) {
            esvControllerRef.current.adjustToSize(containerSize.width, containerSize.height);
            if (pixiRenderAppRef.current?.view) {
                pixiRenderAppRef.current.view.width = containerSize.width;
                pixiRenderAppRef.current.view.height = containerSize.height;
            }
            for (const layer of layers ?? []) {
                layer.element?.setAttribute("width", containerSize.width.toString());
                layer.element?.setAttribute("height", containerSize.height.toString());
            }
            setPrevContainerSize(containerSize);
        }

        if (!isEqual(prevBounds, props.bounds) || currentRevision !== prevRevision) {
            if (props.bounds?.x && props.bounds?.y) {
                esvControllerRef.current.setBounds(props.bounds.x, props.bounds.y);
            }
            setPrevBounds(props.bounds);
        }

        if (!isEqual(prevViewport, props.viewport) || currentRevision !== prevRevision) {
            if (props.viewport) {
                esvControllerRef.current.setViewport(...props.viewport);
            }
            setPrevViewport(props.viewport);
        }

        if (
            !isEqual(
                prevLayerIds,
                props.layers?.map((el) => el.id)
            ) ||
            currentRevision !== prevRevision
        ) {
            for (const layer of props.layers ?? []) {
                if (!prevLayerIds.includes(layer.id)) {
                    const newLayer = makeLayer(layer.type, layer.id, layer.options, pixiRenderAppRef.current);
                    setLayers((prev) => [...prev, newLayer]);
                    esvControllerRef.current.addLayer(newLayer);
                    pointerEventsCalculatorRef.current?.addLayer(newLayer);
                }
            }

            for (const layerId of prevLayerIds) {
                if (props.layers === undefined || !props.layers.some((el) => el.id === layerId)) {
                    setLayers((prev) => prev.filter((el) => el.id !== layerId));
                    esvControllerRef.current.removeLayer(layerId);
                    pointerEventsCalculatorRef.current?.removeLayer(layerId);
                }
            }

            setPrevLayerIds(props.layers?.map((el) => el.id) ?? []);
        }

        if (currentRevision !== prevRevision) {
            setPrevRevision(currentRevision);
        }
    }

    React.useEffect(
        function handleInitController() {
            const containerRefCurrent = containerRef.current;
            if (!containerRefCurrent) {
                return;
            }

            let pointerDown = false;

            esvControllerRef.current = new Controller({
                container: containerRefCurrent,
                axisOptions: props.axesOptions,
                referenceSystem: props.intersectionReferenceSystem,
            });

            pixiRenderAppRef.current = new PixiRenderApplication({
                context: null,
                antialias: true,
                hello: false,
                powerPreference: "default",
                premultipliedAlpha: false,
                preserveDrawingBuffer: false,
                backgroundColor: "#fff",
                clearBeforeRender: true,
                backgroundAlpha: 0,
                width: containerSize.width,
                height: containerSize.height,
            });

            pointerEventsCalculatorRef.current = new PointerEventsCalculator(
                containerRefCurrent,
                esvControllerRef.current
            );

            setCurrentRevision((prev) => prev + 1);

            const esvControllerRefCurrent = esvControllerRef.current;
            const pixiRenderAppRefCurrent = pixiRenderAppRef.current;
            const pointerEventsCalculatorRefCurrent = pointerEventsCalculatorRef.current;

            /*
            const element = esvControllerRefCurrent.overlay.create("focus_displacement", {
                onMouseExit: (event) => {
                    const { target } = event;

                    if (!(target instanceof HTMLElement)) return;

                    target.classList.replace("visible", "invisible");
                },
                onMouseMove: (event) => {
                    const { target, caller, x, y } = event;
                    const referenceSystem = caller.referenceSystem;

                    if (!referenceSystem || !(target instanceof HTMLElement)) return;

                    const displacement = caller.currentStateAsEvent.xScale.invert(x);
                    if (displacement && caller?.referenceSystem) {
                        const { curtain } = caller.referenceSystem.interpolators;
                        const { minX, maxX } = curtain;
                        if ((displacement <= maxX && displacement >= minX) || (displacement < 0 && maxX >= 1000)) {
                            const tvd = caller.currentStateAsEvent.yScale.invert(y);

                            const targetDims = [displacement, tvd];

                            const nearestPoint = curtain.getNearestPosition(targetDims);
                            const md = nearestPoint.distance + caller.referenceSystem.offset;

                            const nearestPointToScreenX = caller.currentStateAsEvent.xScale(nearestPoint.point[0]);
                            const nearestPointToScreenY = caller.currentStateAsEvent.yScale(nearestPoint.point[1]);

                            if (md < 200) {
                                target.classList.replace("invisible", "visible");
                                target.style.left = nearestPointToScreenX + "px";
                                target.style.top = nearestPointToScreenY + "px";
                            } else {
                                target.classList.replace("visible", "invisible");
                            }

                            return;
                        }
                    }

                    target.classList.replace("visible", "invisible");
                },
            });

            if (element) {
                element.classList.add(
                    "invisible",
                    "absolute",
                    "bg-red-500",
                    "rounded-full",
                    "w-[11px]",
                    "h-[11px]",
                    "block",
                    "-ml-[5px]",
                    "-mt-[5px]"
                );
                element.style.zIndex = "100";
            }
            */

            function handlePointerUp() {
                pointerDown = false;
                if (containerRefCurrent) {
                    containerRefCurrent.removeEventListener("pointerup", handlePointerUp);
                    containerRefCurrent.removeEventListener("pointermove", handlePointerMove);
                }
            }

            function handlePointerDown() {
                pointerDown = true;
                if (containerRefCurrent) {
                    containerRefCurrent.addEventListener("pointerup", handlePointerUp);
                    containerRefCurrent.addEventListener("pointermove", handlePointerMove);
                }
            }

            function handlePointerMove() {
                if (pointerDown) {
                    // element?.classList.replace("visible", "invisible");
                }
            }

            const originalRescaleFunction = esvControllerRefCurrent.zoomPanHandler.onRescale;

            function handleRescale(event: OnRescaleEvent) {
                // element?.classList.replace("visible", "invisible");
                originalRescaleFunction(event);
            }

            const currentContainerSize = containerRefCurrent.getBoundingClientRect();

            esvControllerRef.current.adjustToSize(currentContainerSize.width, currentContainerSize.height);

            if (containerRefCurrent) {
                containerRefCurrent.addEventListener("pointerdown", handlePointerDown);
                esvControllerRefCurrent.zoomPanHandler.onRescale = handleRescale;
            }

            return function handleDestroyController() {
                esvControllerRefCurrent.destroy();
                pixiRenderAppRefCurrent.destroy();
                pointerEventsCalculatorRefCurrent.destroy();
                if (containerRefCurrent) {
                    containerRefCurrent.removeEventListener("pointerdown", handlePointerDown);
                }
            };
        },
        [props.axesOptions, props.intersectionReferenceSystem]
    );

    return (
        <>
            <div
                ref={containerRef}
                className={resolveClassNames({ "w-full h-full": props.size === undefined })}
                style={props.size}
            ></div>
        </>
    );
}
