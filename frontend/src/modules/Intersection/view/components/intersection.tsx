import React from "react";

import { BoundingBox3d_api, WellboreCasing_api } from "@api";
import { Casing, IntersectionReferenceSystem, getSeismicInfo, getSeismicOptions } from "@equinor/esv-intersection";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorScale, ColorScaleGradientType } from "@lib/utils/ColorScale";
import {
    CombinedPolylineIntersectionResults,
    IntersectionType,
    Layer,
    LayerType as UserLayerType,
} from "@modules/Intersection/typesAndEnums";
import { BaseLayer, useLayers } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection";
import { Viewport } from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { HighlightItem, HighlightItemShape, ReadoutItem } from "@modules/_shared/components/EsvIntersection/types";
import { ReadoutBox } from "@modules/_shared/components/EsvIntersection/utilityComponents/ReadoutBox";
import { Toolbar } from "@modules/_shared/components/EsvIntersection/utilityComponents/Toolbar";

import { isEqual } from "lodash";

import { ColorScaleWithName } from "../utils/ColorScaleWithName";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    layers: BaseLayer<any, any>[];
    // combinedPolylineIntersectionResults: CombinedPolylineIntersectionResults;
    // polylineIntersectionData: PolylineIntersection_trans | null;
    // seismicSliceImageData: SeismicSliceImageData | null;
    wellboreCasingData: WellboreCasing_api[] | null;
    // gridBoundingBox3d: BoundingBox3d_api | null;
    // colorScale: ColorScale;
    intersectionExtensionLength: number;
    showGridLines: boolean;
    hoveredMd: number | null;
    onReadout: (event: EsvIntersectionReadoutEvent) => void;
    onViewportChange?: (viewport: Viewport) => void;
    onVerticalScaleChange?: (verticalScale: number) => void;
    intersectionType: IntersectionType;
    verticalScale?: number;
    viewport?: Viewport;
};

export function Intersection(props: IntersectionProps): React.ReactNode {
    const { onReadout, onViewportChange, onVerticalScaleChange } = props;

    const layers = useLayers(props.layers);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementBoundingRect(divRef);

    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    const [showGrid, setShowGrid] = React.useState<boolean>(true);

    const [verticalScale, setVerticalScale] = React.useState<number>(props.verticalScale ?? 1);
    const [prevVerticalScale, setPrevVerticalScale] = React.useState<number | undefined>(props.verticalScale);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);

    if (!isEqual(prevVerticalScale, props.verticalScale)) {
        setPrevVerticalScale(props.verticalScale);
        if (props.verticalScale) {
            setVerticalScale(props.verticalScale);
        }
    }

    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const [prevViewport, setPrevViewport] = React.useState<Viewport | undefined>(props.viewport);

    if (!isEqual(prevViewport, props.viewport)) {
        setPrevViewport(props.viewport);
        if (props.viewport && !isEqual(viewport, props.viewport)) {
            setViewport(props.viewport);
        }
    }

    if (props.referenceSystem && !isEqual(prevReferenceSystem, props.referenceSystem)) {
        const newViewport: Viewport = [0, 0, 2000];
        const firstPoint = props.referenceSystem.projectedPath[0];
        const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
        const xMax = Math.max(firstPoint[0], lastPoint[0]);
        const xMin = Math.min(firstPoint[0], lastPoint[0]);
        const yMax = Math.max(firstPoint[1], lastPoint[1]);
        const yMin = Math.min(firstPoint[1], lastPoint[1]);

        newViewport[0] = xMin + (xMax - xMin) / 2;
        newViewport[1] = yMin + (yMax - yMin) / 2;
        newViewport[2] = Math.max(xMax - xMin, yMax - yMin) * 5;
        setViewport(newViewport);
        setPrevReferenceSystem(props.referenceSystem);
    }

    const esvLayers: LayerItem[] = [];
    const colorScales: ColorScaleWithName[] = [];

    if (props.intersectionType === IntersectionType.WELLBORE) {
        esvLayers.push({
            id: "wellbore-path",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                stroke: "red",
                strokeWidth: "2",
                order: 6,
            },
        });
    }

    /*
    if (props.polylineIntersectionData) {
        layers.push({
            id: "intersection",
            type: LayerType.POLYLINE_INTERSECTION,
            hoverable: true,
            options: {
                data: {
                    fenceMeshSections: props.polylineIntersectionData.fenceMeshSections.map((section) => {
                        let zMin = Number.MAX_VALUE;
                        let zMax = Number.MIN_VALUE;

                        const verticesUzArray: Float32Array = new Float32Array(section.verticesUzFloat32Arr.length);

                        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
                            const z = -section.verticesUzFloat32Arr[i + 1];
                            zMin = Math.min(zMin, z);
                            zMax = Math.max(zMax, z);
                            verticesUzArray[i] = section.verticesUzFloat32Arr[i];
                            verticesUzArray[i + 1] = z;
                        }

                        return {
                            polyIndicesArr: section.polyIndicesUintArr,
                            verticesUzArr: verticesUzArray,
                            verticesPerPolyArr: section.verticesPerPolyUintArr,
                            polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                            polyPropsArr: section.polyPropsFloat32Arr,
                            minZ: zMin,
                            maxZ: zMax,
                            startUtmX: section.start_utm_x,
                            startUtmY: section.start_utm_y,
                            endUtmX: section.end_utm_x,
                            endUtmY: section.end_utm_y,
                        };
                    }),
                    minGridPropValue: props.polylineIntersectionData.min_grid_prop_value,
                    maxGridPropValue: props.polylineIntersectionData.max_grid_prop_value,
                    colorScale: props.colorScale,
                    hideGridlines: !props.showGridLines,
                    extensionLengthStart: props.intersectionExtensionLength,
                },
                order: 2,
            },
        });
        const colorScale = ColorScaleWithName.fromColorScale(props.colorScale, "Grid");
        colorScale.setRange(
            props.polylineIntersectionData.min_grid_prop_value,
            props.polylineIntersectionData.max_grid_prop_value
        );
        colorScales.push(colorScale);
    }

    if (props.seismicSliceImageData && props.seismicSliceImageData.image) {
        const seismicInfo = getSeismicInfo(
            {
                ...props.seismicSliceImageData,
            },
            props.seismicSliceImageData.trajectory
        );

        if (seismicInfo) {
            seismicInfo.minX = seismicInfo.minX - props.intersectionExtensionLength;
            seismicInfo.maxX = seismicInfo.maxX - props.intersectionExtensionLength;

            const colorScale = ColorScaleWithName.fromColorScale(props.seismicSliceImageData.colorScale, "Seismic");
            colorScale.setRangeAndMidPoint(seismicInfo.domain.min, seismicInfo.domain.max, 0);
            colorScales.push(colorScale);
        }

        layers.push({
            id: "seismic",
            type: LayerType.SEISMIC_CANVAS,
            options: {
                data: {
                    image: props.seismicSliceImageData.image,
                    options: getSeismicOptions(seismicInfo),
                },
                order: 1,
                layerOpacity: 1,
            },
        });
    }
    */

    if (props.wellboreCasingData) {
        const casingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Casing");
        // const tubingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Tubing");

        const casings: Casing[] = casingData.map((casing, index) => ({
            id: `casing-${index}`,
            diameter: casing.diameter_numeric,
            start: casing.depth_top_md,
            end: casing.depth_bottom_md,
            innerDiameter: casing.diameter_inner,
            kind: "casing",
            hasShoe: false,
        }));

        if (props.intersectionType === IntersectionType.WELLBORE) {
            esvLayers.push({
                id: "schematic",
                type: LayerType.SCHEMATIC,
                hoverable: true,
                options: {
                    data: {
                        holeSizes: [],
                        casings,
                        cements: [],
                        completion: [],
                        pAndA: [],
                        symbols: {},
                        perforations: [],
                    },
                    order: 5,
                },
            });
        }
    }

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            setReadoutItems(event.readoutItems);
            onReadout(event);
        },
        [onReadout]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && props.hoveredMd) {
        const point = props.referenceSystem.project(props.hoveredMd);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
            paintOrder: 6,
        });
    }

    const handleFitInViewClick = React.useCallback(
        function handleFitInViewClick(): void {
            if (props.referenceSystem) {
                const newViewport: [number, number, number] = [0, 0, 2000];
                const firstPoint = props.referenceSystem.projectedPath[0];
                const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
                const xMax = Math.max(firstPoint[0], lastPoint[0]);
                const xMin = Math.min(firstPoint[0], lastPoint[0]);
                const yMax = Math.max(firstPoint[1], lastPoint[1]);
                const yMin = Math.min(firstPoint[1], lastPoint[1]);

                newViewport[0] = xMin + (xMax - xMin) / 2;
                newViewport[1] = yMin + (yMax - yMin) / 2;
                newViewport[2] = Math.max(xMax - xMin, yMax - yMin) * 5;
                setViewport(newViewport);
                if (onViewportChange) {
                    onViewportChange(newViewport);
                }
            }
        },
        [onViewportChange, props.referenceSystem, setViewport]
    );

    const handleShowGridToggle = React.useCallback(
        function handleGridLinesToggle(active: boolean): void {
            setShowGrid(active);
        },
        [setShowGrid]
    );

    const handleVerticalScaleIncrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = prev + 0.1;
                if (onVerticalScaleChange) {
                    onVerticalScaleChange(newVerticalScale);
                }
                return newVerticalScale;
            });
        },
        [onVerticalScaleChange]
    );

    const handleVerticalScaleDecrease = React.useCallback(
        function handleVerticalScaleIncrease(): void {
            setVerticalScale((prev) => {
                const newVerticalScale = Math.max(0.1, prev - 0.1);
                if (onVerticalScaleChange) {
                    onVerticalScaleChange(newVerticalScale);
                }
                return newVerticalScale;
            });
        },
        [onVerticalScaleChange]
    );

    const handleViewportChange = React.useCallback(
        function handleViewportChange(viewport: Viewport) {
            setViewport(viewport);
            if (onViewportChange) {
                onViewportChange(viewport);
            }
        },
        [onViewportChange]
    );

    function makeBounds() {
        const bounds: { x: [number, number]; y: [number, number] } = {
            x: [Number.MAX_VALUE, Number.MIN_VALUE],
            y: [Number.MAX_VALUE, Number.MIN_VALUE],
        };
        for (const layer of props.layers) {
            const boundingBox = layer.getBoundingBox();
            if (boundingBox) {
                bounds.x = [Math.min(bounds.x[0], boundingBox.x[0]), Math.max(bounds.x[1], boundingBox.x[1])];
                bounds.y = [Math.min(bounds.y[0], boundingBox.y[0]), Math.max(bounds.y[1], boundingBox.y[1])];
            }
        }
        if (layers.length === 0 && props.referenceSystem) {
            bounds.x = [props.referenceSystem.startVector[0], props.referenceSystem.endVector[0]];
            bounds.y = [props.referenceSystem.startVector[1], props.referenceSystem.endVector[1]];
        }
        if (layers.length === 0) {
            bounds.x = [-1000, 1000];
            bounds.y = [0, 1000];
        }
        return bounds;
    }

    for (const layer of layers) {
        if (!layer.getIsVisible()) {
            continue;
        }

        if (isGridLayer(layer)) {
            const gridLayer = layer as GridLayer;
            const data = gridLayer.getData();

            if (!data) {
                continue;
            }

            esvLayers.push({
                id: "intersection",
                type: LayerType.POLYLINE_INTERSECTION,
                hoverable: true,
                options: {
                    data: {
                        fenceMeshSections: data.fenceMeshSections.map((section) => {
                            let zMin = Number.MAX_VALUE;
                            let zMax = Number.MIN_VALUE;

                            const verticesUzArray: Float32Array = new Float32Array(section.verticesUzFloat32Arr.length);

                            for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
                                const z = -section.verticesUzFloat32Arr[i + 1];
                                zMin = Math.min(zMin, z);
                                zMax = Math.max(zMax, z);
                                verticesUzArray[i] = section.verticesUzFloat32Arr[i];
                                verticesUzArray[i + 1] = z;
                            }

                            return {
                                polyIndicesArr: section.polyIndicesUintArr,
                                verticesUzArr: verticesUzArray,
                                verticesPerPolyArr: section.verticesPerPolyUintArr,
                                polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                                polyPropsArr: section.polyPropsFloat32Arr,
                                minZ: zMin,
                                maxZ: zMax,
                                startUtmX: section.start_utm_x,
                                startUtmY: section.start_utm_y,
                                endUtmX: section.end_utm_x,
                                endUtmY: section.end_utm_y,
                            };
                        }),
                        minGridPropValue: data.min_grid_prop_value,
                        maxGridPropValue: data.max_grid_prop_value,
                        colorScale: gridLayer.getColorScale(),
                        hideGridlines: !props.showGridLines,
                        extensionLengthStart: props.intersectionExtensionLength,
                    },
                    order: 2,
                },
            });

            const colorScale = ColorScaleWithName.fromColorScale(
                gridLayer.getColorScale(),
                gridLayer.getSettings().parameterName ?? gridLayer.getName()
            );
            colorScales.push(colorScale);
        }

        if (isSeismicLayer(layer)) {
            const seismicLayer = layer as SeismicLayer;
            const data = seismicLayer.getData();

            if (!data || !data.image || !data.options) {
                continue;
            }

            const seismicInfo = getSeismicInfo(data.options, data.options.trajectory);

            if (seismicInfo) {
                seismicInfo.minX = seismicInfo.minX - props.intersectionExtensionLength;
                seismicInfo.maxX = seismicInfo.maxX - props.intersectionExtensionLength;

                const colorScale = ColorScaleWithName.fromColorScale(
                    data.options.colorScale,
                    seismicLayer.getSettings().attribute ?? seismicLayer.getName()
                );
                colorScale.setRangeAndMidPoint(seismicInfo.domain.min, seismicInfo.domain.max, 0);
                colorScales.push(colorScale);
            }

            esvLayers.push({
                id: "seismic",
                type: LayerType.SEISMIC_CANVAS,
                options: {
                    data: {
                        image: data.image,
                        options: getSeismicOptions(seismicInfo),
                    },
                    order: 1,
                    layerOpacity: 1,
                },
            });
        }
    }

    return (
        <div className="relative h-full" ref={divRef}>
            <EsvIntersection
                showGrid={showGrid}
                zFactor={verticalScale}
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                layers={esvLayers}
                bounds={makeBounds()}
                viewport={viewport ?? undefined}
                intersectionThreshold={50}
                highlightItems={highlightItems}
                onReadout={handleReadoutItemsChange}
                onViewportChange={handleViewportChange}
            />
            <ReadoutBox readoutItems={readoutItems} />
            <Toolbar
                visible
                zFactor={verticalScale}
                gridVisible={showGrid}
                onFitInView={handleFitInViewClick}
                onGridLinesToggle={handleShowGridToggle}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
            />
            <ColorLegendsContainer colorScales={colorScales} height={divSize.height / 2 - 50} />
        </div>
    );
}

function countDecimalPlaces(value: number): number {
    const decimalIndex = value.toString().indexOf(".");
    return decimalIndex >= 0 ? value.toString().length - decimalIndex - 1 : 0;
}

function formatLegendValue(value: number): string {
    const numDecimalPlaces = countDecimalPlaces(value);
    if (Math.log10(Math.abs(value)) > 2) {
        return value.toExponential(numDecimalPlaces > 2 ? 2 : numDecimalPlaces);
    }
    return value.toFixed(numDecimalPlaces > 2 ? 2 : numDecimalPlaces);
}

type ColorLegendsContainerProps = {
    colorScales: ColorScaleWithName[];
    height: number;
};

function ColorLegendsContainer(props: ColorLegendsContainerProps): React.ReactNode {
    const width = Math.max(5, Math.min(10, 100 / props.colorScales.length));
    const lineWidth = 6;
    const lineColor = "#555";
    const textGap = 6;
    const offset = 10;
    const legendGap = 4;
    const textWidth = 50;
    const nameWidth = 10;
    const minHeight = Math.min(60 + 2 * offset, props.height);

    const numRows = Math.min(Math.floor(props.height / minHeight), props.colorScales.length);
    const numCols = Math.ceil(props.colorScales.length / numRows);
    const height = Math.max(minHeight, props.height / numRows - (numRows - 1) * legendGap);

    const textStyle: React.CSSProperties = {
        fontSize: "11px",
        stroke: "#fff",
        paintOrder: "stroke",
        strokeWidth: "6px",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        fontWeight: 800,
    };

    function makeLegends(): React.ReactNode[] {
        const legends: React.ReactNode[] = [];
        let index = 0;
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                if (index >= props.colorScales.length) {
                    break;
                }
                const colorScale = props.colorScales[index++];
                const top = row * (height + 2 * offset) + row * legendGap;
                const left = col * (width + legendGap + lineWidth + textGap + textWidth + nameWidth);

                const markers: React.ReactNode[] = [];
                markers.push(
                    <line
                        key="max-marker"
                        x1={left + width + nameWidth + textGap}
                        y1={top + offset}
                        x2={left + width + lineWidth + nameWidth + textGap}
                        y2={top + offset}
                        stroke={lineColor}
                        strokeWidth="1"
                    />
                );
                markers.push(
                    <text
                        key="max-text"
                        x={left + width + lineWidth + textGap + nameWidth + textGap}
                        y={top + offset + 3}
                        fontSize="10"
                        style={textStyle}
                    >
                        {formatLegendValue(colorScale.getMax())}
                    </text>
                );
                if (colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
                    const y =
                        (colorScale.getDivMidPoint() - colorScale.getMin()) /
                        (colorScale.getMax() - colorScale.getMin());
                    markers.push(
                        <line
                            key="mid-marker"
                            x1={left + width + nameWidth + textGap}
                            y1={top + y * height + offset}
                            x2={left + width + lineWidth + nameWidth + textGap}
                            y2={top + y * height + offset}
                            stroke={lineColor}
                            strokeWidth="2"
                        />
                    );
                    markers.push(
                        <text
                            key="mid-text"
                            x={left + width + lineWidth + textGap + nameWidth + textGap}
                            y={top + y * height + offset + 3}
                            fontSize="10"
                            style={textStyle}
                        >
                            {formatLegendValue(colorScale.getDivMidPoint())}
                        </text>
                    );
                } else {
                    const y = 0.5;
                    const value = colorScale.getMin() + (colorScale.getMax() - colorScale.getMin()) * y;
                    markers.push(
                        <line
                            key="mid-marker"
                            x1={left + width + nameWidth + textGap}
                            y1={top + y * height + offset}
                            x2={left + width + lineWidth + nameWidth + textGap}
                            y2={top + y * height + offset}
                            stroke={lineColor}
                            strokeWidth="1"
                        />
                    );
                    markers.push(
                        <text
                            key="mid-text"
                            x={left + width + lineWidth + textGap + nameWidth + textGap}
                            y={top + y * height + offset + 3}
                            fontSize="10"
                            style={textStyle}
                        >
                            {formatLegendValue(value)}
                        </text>
                    );
                }

                markers.push(
                    <line
                        key="min-marker"
                        x1={left + width + nameWidth + textGap}
                        y1={top + height + offset}
                        x2={left + width + lineWidth + nameWidth + textGap}
                        y2={top + height + offset}
                        stroke={lineColor}
                        strokeWidth="1"
                    />
                );
                markers.push(
                    <text
                        key="min-text"
                        x={left + width + lineWidth + textGap + nameWidth + textGap}
                        y={top + height + offset + 3}
                        fontSize="10"
                        style={textStyle}
                    >
                        {formatLegendValue(colorScale.getMin())}
                    </text>
                );

                legends.push(
                    <g key={`color-scale-${colorScale.getColorPalette().getId()}`}>
                        <rect
                            key={index}
                            x={left + nameWidth + textGap}
                            y={top + offset}
                            width={width}
                            rx="4"
                            height={height}
                            fill={`url(#color-legend-gradient-${colorScale.getColorPalette().getId()})`}
                            stroke="#555"
                        />
                        <text
                            x={left}
                            y={top + offset + height / 2 + 6}
                            width={height}
                            height={10}
                            fontSize="10"
                            textAnchor="middle"
                            dominantBaseline="central"
                            alignmentBaseline="baseline"
                            transform={`rotate(270, ${left}, ${top + offset + height / 2})`}
                            style={textStyle}
                        >
                            {colorScale.getName()}
                        </text>
                        {markers}
                    </g>
                );
            }
        }
        return legends;
    }

    return (
        <div className="absolute bottom-8 left-0 flex gap-2 z-50">
            <svg
                style={{
                    height: numRows * (height + 2 * offset) + (numRows - 1) * legendGap,
                    width: numCols * (width + legendGap + lineWidth + textGap + textWidth),
                }}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {props.colorScales.map((colorScale, index) => (
                        <GradientDef key={index} colorScale={colorScale} />
                    ))}
                </defs>
                {makeLegends()}
            </svg>
        </div>
    );
}

type GradientDefProps = {
    colorScale: ColorScale;
};

function GradientDef(props: GradientDefProps): React.ReactNode {
    const colorStops = props.colorScale.getColorStops();
    const gradientId = `color-legend-gradient-${props.colorScale.getColorPalette().getId()}`;

    return (
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {colorStops.toReversed().map((colorStop, index) => (
                <stop
                    key={index}
                    offset={`${((1 - colorStop.offset) * 100).toFixed(2)}%`}
                    stopColor={colorStop.color}
                />
            ))}
        </linearGradient>
    );
}
