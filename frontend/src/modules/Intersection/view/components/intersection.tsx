import React from "react";

import { WellboreCasing_api } from "@api";
import {
    Casing,
    IntersectionReferenceSystem,
    SurfaceData,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { IntersectionType } from "@framework/types/intersection";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { ColorScale, ColorScaleGradientType } from "@lib/utils/ColorScale";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { State } from "@modules/Intersection/state";
import { BaseLayer, useLayers } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { EsvIntersectionReadoutEvent, LayerItem, LayerType } from "@modules/_shared/components/EsvIntersection";
import { Viewport } from "@modules/_shared/components/EsvIntersection/esvIntersection";

import { isEqual } from "lodash";

import { ViewportWrapper } from "./viewportWrapper";

import { ViewAtoms } from "../atoms/atomDefinitions";
import { ColorScaleWithName } from "../utils/ColorScaleWithName";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    layers: BaseLayer<any, any>[];
    wellboreCasingData: WellboreCasing_api[] | null;
    intersectionExtensionLength: number;
    hoveredMd: number | null;
    onReadout: (event: EsvIntersectionReadoutEvent) => void;
    onViewportChange?: (viewport: Viewport) => void;
    onVerticalScaleChange?: (verticalScale: number) => void;
    intersectionType: IntersectionType;
    verticalScale?: number;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>;
    wellboreHeaderUuid: string | null;
};

export function Intersection(props: IntersectionProps): React.ReactNode {
    const layers = useLayers(props.layers);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementBoundingRect(divRef);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [viewport, setViewport] = React.useState<Viewport | null>(null);

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
                order: 6 + layers.length,
            },
        });
    }

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
                    order: 5 + layers.length,
                },
            });
        }
    }

    function makeBounds() {
        let boundsSet: boolean = false;
        const bounds: { x: [number, number]; y: [number, number] } = {
            x: [Number.MAX_VALUE, Number.MIN_VALUE],
            y: [Number.MAX_VALUE, Number.MIN_VALUE],
        };
        for (const layer of layers) {
            const boundingBox = layer.getBoundingBox();
            if (boundingBox) {
                bounds.x = [Math.min(bounds.x[0], boundingBox.x[0]), Math.max(bounds.x[1], boundingBox.x[1])];
                bounds.y = [Math.min(bounds.y[0], boundingBox.y[0]), Math.max(bounds.y[1], boundingBox.y[1])];
                boundsSet = true;
            }
        }
        if (!boundsSet && props.referenceSystem) {
            const firstPoint = props.referenceSystem.projectedPath[0];
            const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
            const xMax = Math.max(firstPoint[0], lastPoint[0]);
            const xMin = Math.min(firstPoint[0], lastPoint[0]);
            const yMax = Math.max(firstPoint[1], lastPoint[1]);
            const yMin = Math.min(firstPoint[1], lastPoint[1]);

            bounds.x = [xMin, xMax];
            bounds.y = [yMin, yMax];
            boundsSet = true;
        }
        if (!boundsSet) {
            bounds.x = [-2000, 2000];
            bounds.y = [0, 1000];
        }
        return bounds;
    }

    for (const [index, layer] of layers.toReversed().entries()) {
        if (!layer.getIsVisible()) {
            continue;
        }

        if (isGridLayer(layer)) {
            const gridLayer = layer as GridLayer;
            const data = gridLayer.getData();

            if (!data) {
                continue;
            }

            const colorScale = gridLayer.getColorScale().clone();

            if (!gridLayer.getUseCustomColorScaleBoundaries()) {
                colorScale.setRange(data.min_grid_prop_value, data.max_grid_prop_value);
            }

            esvLayers.push({
                id: layer.getId(),
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
                        colorScale: colorScale,
                        hideGridlines: !gridLayer.getSettings().showMesh,
                        extensionLengthStart: props.intersectionExtensionLength,
                        gridDimensions: {
                            cellCountI: data.grid_dimensions.i_count,
                            cellCountJ: data.grid_dimensions.j_count,
                            cellCountK: data.grid_dimensions.k_count,
                        },
                    },
                    order: index,
                },
            });

            colorScales.push(colorScale);
        }

        if (isSeismicLayer(layer)) {
            const seismicLayer = layer as SeismicLayer;
            const data = seismicLayer.getData();

            if (!data || !data.image || !data.options) {
                continue;
            }

            const seismicInfo = getSeismicInfo(data.options, data.options.trajectory);

            const colorScale = seismicLayer.getColorScale();

            if (seismicInfo) {
                seismicInfo.minX = seismicInfo.minX - props.intersectionExtensionLength;
                seismicInfo.maxX = seismicInfo.maxX - props.intersectionExtensionLength;

                if (!seismicLayer.getUseCustomColorScaleBoundaries()) {
                    colorScale.setRangeAndMidPoint(seismicInfo.domain.min, seismicInfo.domain.max, 0);
                }
                colorScales.push(colorScale);
            }

            esvLayers.push({
                id: layer.getId(),
                type: LayerType.SEISMIC_CANVAS,
                options: {
                    data: {
                        image: data.image,
                        options: getSeismicOptions(seismicInfo),
                        colorScale,
                    },
                    order: index,
                    layerOpacity: 1,
                },
            });
        }

        if (isSurfaceLayer(layer)) {
            const surfaceLayer = layer;
            const data = surfaceLayer.getData();

            if (!data) {
                continue;
            }

            const colorSet = surfaceLayer.getColorSet();

            let currentColor = colorSet.getFirstColor();
            const surfaceData: SurfaceData = {
                areas: [],
                lines: data.map((surface) => {
                    const color = currentColor;
                    currentColor = colorSet.getNextColor();
                    return {
                        data: surface.cum_lengths.map((el, index) => [el, surface.z_points[index]]),
                        color: color,
                        id: surface.name,
                        label: surface.name,
                    };
                }),
            };

            esvLayers.push({
                id: `${layer.getId()}-surfaces`,
                type: LayerType.GEOMODEL_CANVAS,
                hoverable: true,
                options: {
                    data: surfaceData,
                    order: index,
                },
            });

            esvLayers.push({
                id: `${layer.getId()}-surfaces-labels`,
                type: LayerType.GEOMODEL_LABELS,
                options: {
                    data: surfaceData,
                    order: index,
                },
            });
        }
    }

    return (
        <div className="relative h-full" ref={divRef}>
            <ViewportWrapper
                referenceSystem={props.referenceSystem ?? undefined}
                layers={esvLayers}
                bounds={makeBounds()}
                viewport={viewport}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={props.wellboreHeaderUuid}
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
                        1 -
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
