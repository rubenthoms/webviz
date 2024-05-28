import React from "react";

import { WellboreCasing_api } from "@api";
import {
    Casing,
    IntersectionReferenceSystem,
    SurfaceData,
    getPicksData,
    getSeismicInfo,
    getSeismicOptions,
} from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { IntersectionType } from "@framework/types/intersection";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { State } from "@modules/Intersection/state";
import { BaseLayer, LayerStatus, useLayers } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { SeismicLayer, isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { isWellpicksLayer } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { LayerItem, LayerType } from "@modules/_shared/components/EsvIntersection";
import { Viewport } from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { ColorLegendsContainer } from "@modules_shared/components/ColorLegendsContainer";

import { isEqual } from "lodash";

import { ViewportWrapper } from "./viewportWrapper";

import { ColorScaleWithName } from "../../../_shared/utils/ColorScaleWithName";
import { ViewAtoms } from "../atoms/atomDefinitions";

export type LayersWrapperProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    layers: BaseLayer<any, any>[];
    wellboreCasingData: WellboreCasing_api[] | null;
    intersectionExtensionLength: number;
    intersectionType: IntersectionType;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>;
    wellboreHeaderUuid: string | null;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const layers = useLayers(props.layers);

    const divRef = React.useRef<HTMLDivElement>(null);
    const divSize = useElementBoundingRect(divRef);

    const [prevReferenceSystem, setPrevReferenceSystem] = React.useState<IntersectionReferenceSystem | null>(null);
    const [viewport, setViewport] = React.useState<Viewport | null>(null);
    const [prevLayersViewport, setPrevViewport] = React.useState<Viewport | null>(null);

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
        newViewport[2] = Math.max(viewport?.at(2) ?? 0, Math.max(xMax - xMin, yMax - yMin) * 1.2);

        setViewport(newViewport);
        setPrevReferenceSystem(props.referenceSystem);
    }

    const esvLayers: LayerItem[] = [];
    const colorScales: { id: string; colorScale: ColorScaleWithName }[] = [];

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

    const bounds: { x: [number, number]; y: [number, number] } = {
        x: [Number.MAX_VALUE, Number.MIN_VALUE],
        y: [Number.MAX_VALUE, Number.MIN_VALUE],
    };
    let boundsSet: boolean = false;
    let layersViewport: Viewport = viewport ?? [0, 0, 2000];

    for (const [index, layer] of layers.toReversed().entries()) {
        const boundingBox = layer.getBoundingBox();
        if (boundingBox) {
            bounds.x = [Math.min(bounds.x[0], boundingBox.x[0]), Math.max(bounds.x[1], boundingBox.x[1])];
            bounds.y = [Math.min(bounds.y[0], boundingBox.y[0]), Math.max(bounds.y[1], boundingBox.y[1])];
            boundsSet = true;

            layersViewport = [
                bounds.x[0] + (bounds.x[1] - bounds.x[0]) / 2,
                bounds.y[0] + (bounds.y[1] - bounds.y[0]) / 2,
                Math.max(bounds.x[1] - bounds.x[0], bounds.y[1] - bounds.y[0]) * 1.2,
            ];
        }

        if (!layer.getIsVisible() || layer.getStatus() !== LayerStatus.SUCCESS) {
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

            colorScales.push({ id: `${layer.getId()}-${colorScale.getColorPalette().getId()}`, colorScale });
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
                colorScales.push({ id: `${layer.getId()}-${colorScale.getColorPalette().getId()}`, colorScale });
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
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });

            esvLayers.push({
                id: `${layer.getId()}-surfaces-labels`,
                type: LayerType.GEOMODEL_LABELS,
                options: {
                    data: surfaceData,
                    order: index,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });
        }

        if (isWellpicksLayer(layer)) {
            const wellpicksLayer = layer;
            const data = wellpicksLayer.getFilteredData();

            if (!data) {
                continue;
            }

            esvLayers.push({
                id: layer.getId(),
                type: LayerType.CALLOUT_CANVAS,
                hoverable: false,
                options: {
                    data: getPicksData(data),
                    order: index,
                    referenceSystem: props.referenceSystem ?? undefined,
                },
            });
        }
    }

    if (!isEqual(layersViewport, prevLayersViewport)) {
        setViewport(layersViewport);
        setPrevViewport(layersViewport);
    }

    if (!boundsSet && props.referenceSystem) {
        const firstPoint = props.referenceSystem.projectedPath[0];
        const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
        const xMax = Math.max(firstPoint[0], lastPoint[0], 1000);
        const xMin = Math.min(firstPoint[0], lastPoint[0], -1000);
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

    return (
        <div className="relative h-full" ref={divRef}>
            <ViewportWrapper
                referenceSystem={props.referenceSystem ?? undefined}
                layers={esvLayers}
                bounds={bounds}
                viewport={viewport}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={props.wellboreHeaderUuid}
            />
            <ColorLegendsContainer colorScales={colorScales} height={divSize.height / 2 - 50} />
        </div>
    );
}
