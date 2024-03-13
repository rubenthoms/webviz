import React from "react";

import {
    Annotation,
    AxisOptions,
    CalloutCanvasLayer,
    CalloutOptions,
    Controller,
    GeomodelCanvasLayer,
    GeomodelLabelsLayer,
    GeomodelLayerLabelsOptions,
    GeomodelLayerV2,
    GridLayer,
    ImageLayer,
    IntersectionReferenceSystem,
    Layer,
    LayerOptions,
    OnRescaleEvent,
    PixiRenderApplication,
    ReferenceLine,
    ReferenceLineLayer,
    SchematicData,
    SchematicLayer,
    SchematicLayerOptions,
    SeismicCanvasData,
    SeismicCanvasLayer,
    SurfaceData,
    WellborepathLayer,
    WellborepathLayerOptions,
} from "@equinor/esv-intersection";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Size2D } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

import { InteractivityHandler } from "./InteractivityHandler";
import {
    PolylineIntersectionData,
    PolylineIntersectionLayerOptions,
    PoylineIntersectionLayer,
} from "./layers/PolylineIntersectionLayer";
import {
    SurfaceStatisticalFanchartsCanvasLayer,
    SurfaceStatisticalFanchartsData,
} from "./layers/SurfaceStatisticalFanchartCanvasLayer";

export enum LayerType {
    CALLOUT_CANVAS = "callout-canvas",
    GEOMODEL_CANVAS = "geomodel-canvas",
    GEOMODEL_LABELS = "geomodel-labels",
    GEOMODEL_V2 = "geomodel-v2",
    POLYLINE_INTERSECTION = "grid-intersection",
    IMAGE_CANVAS = "image-canvas",
    REFERENCE_LINE = "reference-line",
    SCHEMATIC = "schematic-layer",
    SEISMIC_CANVAS = "seismic-canvas",
    SURFACE_STATISTICAL_FANCHARTS_CANVAS = "surface-statistical-fancharts-canvas",
    WELLBORE_PATH = "wellborepath",
}

type LayerDataTypeMap = {
    [LayerType.CALLOUT_CANVAS]: Annotation[];
    [LayerType.GEOMODEL_CANVAS]: SurfaceData;
    [LayerType.GEOMODEL_LABELS]: SurfaceData;
    [LayerType.GEOMODEL_V2]: SurfaceData;
    [LayerType.IMAGE_CANVAS]: unknown;
    [LayerType.POLYLINE_INTERSECTION]: PolylineIntersectionData;
    [LayerType.REFERENCE_LINE]: ReferenceLine[];
    [LayerType.SCHEMATIC]: SchematicData;
    [LayerType.SEISMIC_CANVAS]: SeismicCanvasData;
    [LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: SurfaceStatisticalFanchartsData;
    [LayerType.WELLBORE_PATH]: [number, number][];
};

type LayerOptionsMap = {
    [LayerType.CALLOUT_CANVAS]: CalloutOptions<Annotation[]>;
    [LayerType.GEOMODEL_CANVAS]: LayerOptions<SurfaceData>;
    [LayerType.GEOMODEL_LABELS]: GeomodelLayerLabelsOptions<SurfaceData>;
    [LayerType.GEOMODEL_V2]: LayerOptions<SurfaceData>;
    [LayerType.IMAGE_CANVAS]: LayerOptions<unknown>;
    [LayerType.POLYLINE_INTERSECTION]: PolylineIntersectionLayerOptions;
    [LayerType.REFERENCE_LINE]: LayerOptions<ReferenceLine[]>;
    [LayerType.SCHEMATIC]: SchematicLayerOptions<SchematicData>;
    [LayerType.SEISMIC_CANVAS]: LayerOptions<SeismicCanvasData>;
    [LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS]: LayerOptions<SurfaceStatisticalFanchartsData>;
    [LayerType.WELLBORE_PATH]: WellborepathLayerOptions<[number, number][]>;
};

export type LayerItem<T extends keyof LayerOptionsMap> = {
    type: T;
    id: string;
    options: LayerOptionsMap[T];
};

export type EsvIntersectionProps<T extends keyof LayerDataTypeMap> = {
    size?: Size2D;
    showGrid?: boolean;
    axesOptions?: AxisOptions;
    showAxesLabels?: boolean;
    showAxes?: boolean;
    layers?: LayerItem<T>[];
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
        case LayerType.CALLOUT_CANVAS:
            return new CalloutCanvasLayer(id, options as CalloutOptions<Annotation[]>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_CANVAS:
            return new GeomodelCanvasLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_LABELS:
            return new GeomodelLabelsLayer(id, options as LayerOptions<SurfaceData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.GEOMODEL_V2:
            return new GeomodelLayerV2(
                pixiRenderApplication,
                id,
                options as LayerOptions<SurfaceData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.POLYLINE_INTERSECTION:
            return new PoylineIntersectionLayer(
                pixiRenderApplication,
                id,
                options as PolylineIntersectionLayerOptions
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.IMAGE_CANVAS:
            return new ImageLayer(id, options as LayerOptions<unknown>) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.REFERENCE_LINE:
            return new ReferenceLineLayer(id, options as LayerOptions<ReferenceLine[]>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.SCHEMATIC:
            return new SchematicLayer(
                pixiRenderApplication,
                id,
                options as SchematicLayerOptions<SchematicData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.SEISMIC_CANVAS:
            return new SeismicCanvasLayer(id, options as LayerOptions<SeismicCanvasData>) as unknown as Layer<
                LayerDataTypeMap[T]
            >;
        case LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS:
            return new SurfaceStatisticalFanchartsCanvasLayer(
                id,
                options as LayerOptions<SurfaceStatisticalFanchartsData>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
        case LayerType.WELLBORE_PATH:
            return new WellborepathLayer(
                id,
                options as WellborepathLayerOptions<[number, number][]>
            ) as unknown as Layer<LayerDataTypeMap[T]>;
    }

    throw new Error("Unsupported layer type");
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
    const [prevShowAxesLabels, setPrevShowAxesLabels] = React.useState<boolean | undefined>(undefined);
    const [prevShowAxes, setPrevShowAxes] = React.useState<boolean | undefined>(undefined);
    const [userTransform, setUserTransform] = React.useState<OnRescaleEvent["transform"] | null>(null);

    const [currentRevision, setCurrentRevision] = React.useState<number>(0);
    const [layers, setLayers] = React.useState<Layer<unknown>[]>([]);

    const esvControllerRef = React.useRef<Controller | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const pixiRenderAppRef = React.useRef<PixiRenderApplication | null>(null);
    const pointerEventsCalculatorRef = React.useRef<InteractivityHandler | null>(null);

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

        if (prevShowAxes !== props.showAxes || currentRevision !== prevRevision) {
            if (props.showAxes) {
                esvControllerRef.current.showAxis();
            } else {
                esvControllerRef.current.hideAxis();
            }
            setPrevShowAxes(props.showAxes);
        }

        if (prevShowAxesLabels !== props.showAxesLabels || currentRevision !== prevRevision) {
            if (props.showAxesLabels) {
                esvControllerRef.current.showAxisLabels();
            } else {
                esvControllerRef.current.hideAxisLabels();
            }
            setPrevShowAxesLabels(props.showAxesLabels);
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

        if (!isEqual(prevViewport, props.viewport)) {
            if (props.viewport) {
                esvControllerRef.current.setViewport(...props.viewport);
            }
            setPrevViewport(props.viewport);
        } else if (currentRevision !== prevRevision && userTransform) {
            esvControllerRef.current.zoomPanHandler.applyTransform(userTransform);
        }

        if (
            !isEqual(
                prevLayerIds,
                props.layers?.map((el) => el.id)
            ) ||
            currentRevision !== prevRevision
        ) {
            let newLayers = layers;
            for (const layer of props.layers ?? []) {
                if (!prevLayerIds.includes(layer.id)) {
                    const newLayer = makeLayer(layer.type, layer.id, layer.options, pixiRenderAppRef.current);
                    newLayers = [...newLayers, newLayer];
                    esvControllerRef.current.addLayer(newLayer);
                    pointerEventsCalculatorRef.current?.addLayer(newLayer);
                }
            }

            for (const layerId of prevLayerIds) {
                if (props.layers === undefined || !props.layers.some((el) => el.id === layerId)) {
                    newLayers = newLayers.filter((el) => el.id !== layerId);
                    esvControllerRef.current.removeLayer(layerId);
                    pointerEventsCalculatorRef.current?.removeLayer(layerId);
                }
            }

            setLayers(newLayers);
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

            esvControllerRef.current = new Controller({
                container: containerRefCurrent,
                axisOptions: props.axesOptions,
                referenceSystem: props.intersectionReferenceSystem,
            });

            pointerEventsCalculatorRef.current = new InteractivityHandler(
                containerRefCurrent,
                esvControllerRef.current
            );

            const originalRescaleHandler = esvControllerRef.current.zoomPanHandler.onRescale;

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

            setCurrentRevision((prev) => prev + 1);

            const esvControllerRefCurrent = esvControllerRef.current;
            const pointerEventsCalculatorRefCurrent = pointerEventsCalculatorRef.current;
            const pixiRenderAppReCurrent = pixiRenderAppRef.current;

            esvControllerRefCurrent.zoomPanHandler.onRescale = (event: OnRescaleEvent) => {
                setUserTransform(event.transform);
                originalRescaleHandler(event);
            };

            return function handleDestroyController() {
                pixiRenderAppReCurrent.destroy();
                esvControllerRefCurrent.removeAllLayers();
                esvControllerRefCurrent.destroy();
                pointerEventsCalculatorRefCurrent.destroy();
                setLayers([]);
                setPrevLayerIds([]);
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
