import React from "react";

import { BoundingBox3d_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { colorTablesObj } from "@emerson-eps/color-tables";
import { ColorScale } from "@lib/utils/ColorScale";
import {
    AxesLayer,
    Grid3DLayer,
    NorthArrow3DLayer,
    PointsLayer,
    WellsLayer,
} from "@webviz/subsurface-viewer/dist/layers";

import { Color, Rgb, parse } from "culori";

import { SubsurfaceViewerWrapper } from "./SubsurfaceViewerWrapper";

import {
    FenceMeshSection_trans,
    GridMappedProperty_trans,
    GridSurface_trans,
    PolylineIntersection_trans,
} from "../queries/queryDataTransforms";

export type Grid3DProps = {
    gridSurfaceData: GridSurface_trans | null;
    gridParameterData: GridMappedProperty_trans | null;
    fieldWellboreTrajectoriesData: WellboreTrajectory_api[] | null;
    polylineIntersectionData: PolylineIntersection_trans | null;
    editCustomPolyline: number[][] | null;
    selectedWellboreUuid: string | null;
    boundingBox3d: BoundingBox3d_api | null;
    colorScale: ColorScale;
    showGridLines: boolean;
    zFactor: number;
    hoveredMdPoint3d: number[] | null;
    editModeActive: boolean;
    onHoveredMdChange: (md: number | null) => void;
    onEditPolylineChange: (polyline: number[][]) => void;
};

type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;

export function Grid3D(props: Grid3DProps): React.ReactNode {
    const { onHoveredMdChange } = props;

    const [hoveredMdPoint, setHoveredMdPoint] = React.useState<number[] | null>(null);

    const bounds: [number, number, number, number] | undefined = props.boundingBox3d
        ? [props.boundingBox3d.xmin, props.boundingBox3d.ymin, props.boundingBox3d.xmax, props.boundingBox3d.ymax]
        : undefined;

    const axesBounds = props.boundingBox3d
        ? [
              props.boundingBox3d.xmin,
              props.boundingBox3d.ymin,
              props.boundingBox3d.zmin,
              props.boundingBox3d.xmax,
              props.boundingBox3d.ymax,
              props.boundingBox3d.zmax,
          ]
        : [0, 0, 0, 100, 100, 100];

    const colorTables = createContinuousColorScaleForMap(props.colorScale);

    const northArrowLayer = new NorthArrow3DLayer({
        id: "north-arrow-layer",
        visible: true,
    });
    const axesLayer = new AxesLayer({
        id: "axes-layer",
        bounds: axesBounds as [number, number, number, number, number, number],
        visible: true,
        ZIncreasingDownwards: true,
    });

    const layers: Layer[] = [northArrowLayer, axesLayer];

    if (props.fieldWellboreTrajectoriesData) {
        const tempWorkingWellsData = props.fieldWellboreTrajectoriesData.filter(
            (el) =>
                el.unique_wellbore_identifier !== "NO 34/4-K-3 AH" && el.wellbore_uuid !== props.selectedWellboreUuid
        );
        const wellLayerDataFeatures = tempWorkingWellsData.map((well) =>
            wellTrajectoryToGeojson(well, props.selectedWellboreUuid)
        );

        const wellsLayer = new WellsLayer({
            id: "wells-layer",
            data: {
                type: "FeatureCollection",
                unit: "m",
                features: wellLayerDataFeatures,
            },
            refine: false,
            lineStyle: { width: 2 },
            wellHeadStyle: { size: 1 },
            pickable: true,
            ZIncreasingDownwards: false,
        });

        layers.push(wellsLayer);

        if (props.selectedWellboreUuid) {
            const selectedWellbore = props.fieldWellboreTrajectoriesData.find(
                (well) => well.wellbore_uuid === props.selectedWellboreUuid
            );
            if (selectedWellbore) {
                const wellLayerDataFeature = wellTrajectoryToGeojson(selectedWellbore, props.selectedWellboreUuid);
                const selectedWellLayer = new WellsLayer({
                    id: "selected-well-layer",
                    data: {
                        type: "FeatureCollection",
                        unit: "m",
                        features: [wellLayerDataFeature],
                    },
                    refine: false,
                    lineStyle: { width: 5, color: [255, 0, 0, 255] },
                    wellHeadStyle: { size: 10, color: [255, 0, 0, 255] },
                    pickable: true,
                    ZIncreasingDownwards: false,
                });

                layers.push(selectedWellLayer);
            }
        }
    }

    let minPropValue = Number.MAX_VALUE;
    let maxPropValue = -Number.MAX_VALUE;
    if (props.gridParameterData) {
        minPropValue = Math.min(props.gridParameterData.min_grid_prop_value, minPropValue);
        maxPropValue = Math.max(props.gridParameterData.max_grid_prop_value, maxPropValue);
    }
    if (props.polylineIntersectionData) {
        minPropValue = Math.min(props.polylineIntersectionData.min_grid_prop_value, minPropValue);
        maxPropValue = Math.max(props.polylineIntersectionData.max_grid_prop_value, maxPropValue);
    }

    if (props.gridSurfaceData && props.gridParameterData) {
        const offsetXyz = [props.gridSurfaceData.origin_utm_x, props.gridSurfaceData.origin_utm_y, 0];
        const pointsNumberArray = props.gridSurfaceData.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
        const polysNumberArray = props.gridSurfaceData.polysUint32Arr;
        const grid3dLayer = new Grid3DLayer({
            id: "grid-3d-layer",
            pointsData: pointsNumberArray as unknown as number[],
            polysData: polysNumberArray as unknown as number[],
            propertiesData: props.gridParameterData.polyPropsFloat32Arr as unknown as number[],
            colorMapName: "Continuous",
            colorMapRange: [minPropValue, maxPropValue],
            ZIncreasingDownwards: false,
            gridLines: props.showGridLines,
            material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
            pickable: true,
        });
        layers.push(grid3dLayer as unknown as WorkingGrid3dLayer);
    }

    if (props.polylineIntersectionData) {
        const polyData = buildVtkStylePolyDataFromFenceSections(props.polylineIntersectionData.fenceMeshSections);
        const grid3dIntersectionLayer = new Grid3DLayer({
            id: "grid-3d-intersection-layer",
            pointsData: polyData.points as unknown as number[],
            polysData: polyData.polys as unknown as number[],
            propertiesData: polyData.props as unknown as number[],
            colorMapName: "Continuous",
            colorMapRange: [minPropValue, maxPropValue],
            ZIncreasingDownwards: false,
            gridLines: props.showGridLines,
            colorMapClampColor: false,
            material: { ambient: 0.4, diffuse: 0.7, shininess: 8, specularColor: [25, 25, 25] },
        });
        layers.push(grid3dIntersectionLayer as unknown as WorkingGrid3dLayer);
    }

    if (props.hoveredMdPoint3d || hoveredMdPoint) {
        let point = props.hoveredMdPoint3d;
        if (hoveredMdPoint) {
            point = hoveredMdPoint;
        }
        const pointsLayer = new PointsLayer({
            id: "hovered-md-point-layer",
            pointsData: point as number[],
            color: [255, 0, 0, 255],
            pointRadius: 10,
            radiusUnits: "pixels",
            ZIncreasingDownwards: true,
            depthTest: false,
            name: "Hovered MD Point",
        });
        layers.push(pointsLayer);
    }

    /*
    const handleMouseEvent = React.useCallback(
        function handleMouseEvent(event: MapMouseEvent) {
            if (event.type === "click" && props.editModeActive) {
                if (event.x && event.y) {
                    for (const info of event.infos) {
                        if ("layer" in info && info.layer?.id === "user-polyline-point-layer") {
                            if (info.picked) {
                                return;
                            }
                        }
                    }
                    const point = [event.x, event.y];
                    setEditPolyline((prev) => {
                        let newPolyline: number[][] = [];
                        if (selectedPolylineIndex === null || selectedPolylineIndex === prev.length - 1) {
                            newPolyline = [...prev, point];
                            setSelectedPolylineIndex(prev.length);
                        } else if (selectedPolylineIndex === 0) {
                            newPolyline = [point, ...prev];
                            setSelectedPolylineIndex(0);
                        } else {
                            newPolyline = prev;
                        }
                        props.onEditPolylineChange(newPolyline);
                        return newPolyline;
                    });
                }
            }
            if (event.type === "hover") {
                if (props.fieldWellboreTrajectoriesData) {
                    let hoveredMd: number | null = null;
                    let coordinate: number[] | null = null;
                    for (const info of event.infos) {
                        if (!("layer" in info) || info.layer?.id !== "selected-well-layer") {
                            continue;
                        }
                        if ("object" in info && "properties" in info.object && "properties" in info) {
                            if ("uuid" in info.object.properties) {
                                if (info.object.properties.uuid === props.selectedWellboreUuid) {
                                    const properties = info.properties as Record<string, string>[];
                                    for (const property of properties) {
                                        if (property.name && property.name.startsWith("MD") && property.value) {
                                            hoveredMd = parseFloat(property.value.split(" ")[0]);
                                            if ("coordinate" in info && info.coordinate) {
                                                coordinate = [
                                                    info.coordinate[0],
                                                    info.coordinate[1],
                                                    -info.coordinate[2],
                                                ];
                                                break;
                                            }
                                        }
                                    }
                                    if (hoveredMd !== null) {
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (coordinate) {
                        setHoveredMdPoint(coordinate);
                    } else {
                        setHoveredMdPoint(null);
                    }

                    if (hoveredMd !== null) {
                        onHoveredMdChange(hoveredMd);
                        return;
                    }

                    onHoveredMdChange(null);
                }
            }
        },
        [
            onHoveredMdChange,
            props.selectedWellboreUuid,
            setHoveredMdPoint,
            editPolyline,
            props.editModeActive,
            selectedPolylineIndex,
        ]
    );
    */

    if (!props.boundingBox3d) {
        return null;
    }

    return (
        <div className="relative w-full h-1/2">
            <SubsurfaceViewerWrapper
                layers={layers}
                boundingBox={props.boundingBox3d}
                colorTables={colorTables}
                show3D
                enableIntersectionPolylineEditing={true}
            />
        </div>
    );
}

interface PolyDataVtk {
    points: Float32Array;
    polys: Uint32Array;
    props: Float32Array;
}

function buildVtkStylePolyDataFromFenceSections(fenceSections: FenceMeshSection_trans[]): PolyDataVtk {
    const startTS = performance.now();

    // Calculate sizes of typed arrays
    let totNumVertices = 0;
    let totNumPolygons = 0;
    let totNumConnectivities = 0;
    for (const section of fenceSections) {
        totNumVertices += section.verticesUzFloat32Arr.length / 2;
        totNumPolygons += section.verticesPerPolyUintArr.length;
        totNumConnectivities += section.polyIndicesUintArr.length;
    }

    const pointsFloat32Arr = new Float32Array(3 * totNumVertices);
    const polysUint32Arr = new Uint32Array(totNumPolygons + totNumConnectivities);
    const polyPropsFloat32Arr = new Float32Array(totNumPolygons);

    let floatPointsDstIdx = 0;
    let polysDstIdx = 0;
    let propsDstIdx = 0;
    for (const section of fenceSections) {
        // uv to xyz
        const directionX = section.end_utm_x - section.start_utm_x;
        const directionY = section.end_utm_y - section.start_utm_y;
        const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
        const unitDirectionX = directionX / magnitude;
        const unitDirectionY = directionY / magnitude;

        const connOffset = floatPointsDstIdx / 3;

        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
            const u = section.verticesUzFloat32Arr[i];
            const z = section.verticesUzFloat32Arr[i + 1];
            const x = u * unitDirectionX + section.start_utm_x;
            const y = u * unitDirectionY + section.start_utm_y;

            pointsFloat32Arr[floatPointsDstIdx++] = x;
            pointsFloat32Arr[floatPointsDstIdx++] = y;
            pointsFloat32Arr[floatPointsDstIdx++] = z;
        }

        // Fix poly indexes for each section
        const numPolysInSection = section.verticesPerPolyUintArr.length;
        let srcIdx = 0;
        for (let i = 0; i < numPolysInSection; i++) {
            const numVertsInPoly = section.verticesPerPolyUintArr[i];
            polysUint32Arr[polysDstIdx++] = numVertsInPoly;

            for (let j = 0; j < numVertsInPoly; j++) {
                polysUint32Arr[polysDstIdx++] = section.polyIndicesUintArr[srcIdx++] + connOffset;
            }
        }

        polyPropsFloat32Arr.set(section.polyPropsFloat32Arr, propsDstIdx);
        propsDstIdx += numPolysInSection;
    }

    console.debug(`buildVtkStylePolyDataFromFenceSections() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        points: pointsFloat32Arr,
        polys: polysUint32Arr,
        props: polyPropsFloat32Arr,
    };
}

export function wellTrajectoryToGeojson(
    wellTrajectory: WellboreTrajectory_api,
    selectedWellboreUuid: string | null
): Record<string, unknown> {
    const point: Record<string, unknown> = {
        type: "Point",
        coordinates: [wellTrajectory.easting_arr[0], wellTrajectory.northing_arr[0], -wellTrajectory.tvd_msl_arr[0]],
    };
    const coordinates: Record<string, unknown> = {
        type: "LineString",
        coordinates: zipCoords(wellTrajectory.easting_arr, wellTrajectory.northing_arr, wellTrajectory.tvd_msl_arr),
    };

    let color = [0, 0, 0, 100];
    if (selectedWellboreUuid && wellTrajectory.wellbore_uuid === selectedWellboreUuid) {
        color = [255, 0, 0, 100];
    }

    const geometryCollection: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "GeometryCollection",
            geometries: [point, coordinates],
        },
        properties: {
            uuid: wellTrajectory.wellbore_uuid,
            name: wellTrajectory.unique_wellbore_identifier,
            uwi: wellTrajectory.unique_wellbore_identifier,
            color,
            md: [wellTrajectory.md_arr],
        },
    };

    return geometryCollection;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}

export function createContinuousColorScaleForMap(colorScale: ColorScale): colorTablesObj[] {
    const hexColors = colorScale.getPlotlyColorScale();
    const rgbArr: [number, number, number, number][] = [];
    hexColors.forEach((hexColor) => {
        const color: Color | undefined = parse(hexColor[1]); // Returns object with r, g, b items for hex strings

        if (color && "r" in color && "g" in color && "b" in color) {
            const rgbColor = color as Rgb;
            rgbArr.push([hexColor[0], rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255]);
        }
    });

    return [{ name: "Continuous", discrete: false, colors: rgbArr }];
}
