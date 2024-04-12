import React from "react";

import { BoundingBox3d_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { ColumnLayer, SolidPolygonLayer } from "@deck.gl/layers/typed";
import { colorTablesObj } from "@emerson-eps/color-tables";
import { ColorScale } from "@lib/utils/ColorScale";
import SubsurfaceViewer, {
    MapMouseEvent,
    SubsurfaceViewerProps,
    ViewStateType,
} from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import {
    AxesLayer,
    Grid3DLayer,
    NorthArrow3DLayer,
    PointsLayer,
    WellsLayer,
} from "@webviz/subsurface-viewer/dist/layers";

import { Color, Rgb, parse } from "culori";
import { isEqual } from "lodash";

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

export function Grid3D(props: Grid3DProps): JSX.Element {
    const { onHoveredMdChange } = props;

    const [hoveredMdPoint, setHoveredMdPoint] = React.useState<number[] | null>(null);
    const [editPolyline, setEditPolyline] = React.useState<number[][]>([]);
    const [prevEditCustomPolyline, setPrevCustomPolyline] = React.useState<number[][] | null>(null);
    const [prevEditModeActive, setPrevEditModeActive] = React.useState<boolean>(false);
    const [hoveredPolylineIndex, setHoveredPolylineIndex] = React.useState<number | null>(null);
    const [selectedPolylineIndex, setSelectedPolylineIndex] = React.useState<number | null>(null);
    const [userCameraInteractionActive, setUserCameraInteractionActive] = React.useState<boolean>(true);

    if (!isEqual(props.editCustomPolyline, prevEditCustomPolyline)) {
        setEditPolyline(props.editCustomPolyline ?? []);
        setSelectedPolylineIndex(props.editCustomPolyline ? props.editCustomPolyline.length - 1 : null);
        setPrevCustomPolyline(props.editCustomPolyline);
    }

    if (!isEqual(props.editModeActive, prevEditModeActive)) {
        setPrevEditModeActive(props.editModeActive);
        if (!props.editModeActive) {
            setSelectedPolylineIndex(null);
            setHoveredPolylineIndex(null);
            setEditPolyline([]);
        }
    }

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

    let zMid = 0;
    let zExtension = 0;
    if (props.boundingBox3d) {
        zMid = -(props.boundingBox3d.zmin + (props.boundingBox3d.zmax - props.boundingBox3d.zmin) / 2);
        zExtension = Math.abs(props.boundingBox3d.zmax - props.boundingBox3d.zmin) + 100;
    }

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

    const currentlyEditedPolylineData = makePolylineData(
        editPolyline,
        zMid,
        zExtension,
        selectedPolylineIndex,
        hoveredPolylineIndex,
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
        onHover(pickingInfo) {
            if (!props.editModeActive) {
                return;
            }
            if (pickingInfo.object && pickingInfo.object.index < editPolyline.length) {
                setHoveredPolylineIndex(pickingInfo.object.index);
            } else {
                setHoveredPolylineIndex(null);
            }
        },
        onClick(pickingInfo, event) {
            if (!props.editModeActive) {
                return;
            }

            if (pickingInfo.object && pickingInfo.object.index < editPolyline.length) {
                setSelectedPolylineIndex(pickingInfo.object.index);
                event.stopPropagation();
                event.handled = true;
            } else {
                setSelectedPolylineIndex(null);
            }
        },
        onDragStart(pickingInfo) {
            if (!props.editModeActive) {
                return;
            }
            if (pickingInfo.object && selectedPolylineIndex === pickingInfo.object.index) {
                setUserCameraInteractionActive(false);
            }
        },
        onDragEnd() {
            setUserCameraInteractionActive(true);
        },
        onDrag(pickingInfo) {
            if (!props.editModeActive) {
                return;
            }

            if (pickingInfo.object) {
                const index = pickingInfo.object.index;
                if (!pickingInfo.coordinate) {
                    return;
                }
                setEditPolyline((prev) => {
                    const newPolyline = prev.reduce((acc, point, i) => {
                        if (i === index && pickingInfo.coordinate) {
                            return [...acc, [pickingInfo.coordinate[0], pickingInfo.coordinate[1]]];
                        }
                        return [...acc, point];
                    }, [] as number[][]);

                    props.onEditPolylineChange(newPolyline);
                    return newPolyline;
                });
            }
        },
    });
    layers.push(userPolylinePointLayer);

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

    React.useEffect(() => {
        function handleKeyboardEvent(event: KeyboardEvent) {
            if (!props.editModeActive) {
                return;
            }
            if (event.key === "Delete" && selectedPolylineIndex !== null) {
                setSelectedPolylineIndex((prev) => (prev === null || prev === 0 ? null : prev - 1));
                setEditPolyline((prev) => {
                    const newPolyline = prev.filter((_, i) => i !== selectedPolylineIndex);
                    props.onEditPolylineChange(newPolyline);
                    return newPolyline;
                });
            }
        }

        document.addEventListener("keydown", handleKeyboardEvent);

        return () => {
            document.removeEventListener("keydown", handleKeyboardEvent);
        };
    }, [selectedPolylineIndex, setEditPolyline, setSelectedPolylineIndex, props.editModeActive]);

    return (
        <div className="relative w-full h-1/2">
            <SubsurfaceViewerWithCameraState
                id="subsurface-view"
                userCameraInteractionActive={userCameraInteractionActive}
                layers={layers}
                bounds={bounds}
                colorTables={colorTables}
                views={{
                    layout: [1, 1],
                    showLabel: false,
                    viewports: [
                        {
                            id: "view_3d",
                            isSync: true,
                            show3D: true,
                            layerIds: [
                                "north-arrow-layer",
                                "axes-layer",
                                "wells-layer",
                                "hovered-md-point-layer",
                                "selected-well-layer",
                                "grid-3d-layer",
                                "grid-3d-intersection-layer",
                                "user-polyline-point-layer",
                                "user-polyline-line-layer",
                            ],
                        },
                    ],
                }}
                onMouseEvent={handleMouseEvent}
            />
        </div>
    );
}

type SubsurfaceViewerWithCameraStateProps = SubsurfaceViewerProps & {
    userCameraInteractionActive?: boolean;
};

function SubsurfaceViewerWithCameraState(props: SubsurfaceViewerWithCameraStateProps): React.ReactNode {
    const [prevBounds, setPrevBounds] = React.useState<[number, number, number, number] | undefined>(undefined);
    const [cameraPosition, setCameraPosition] = React.useState<ViewStateType | undefined>(undefined);

    if (!isEqual(props.bounds, prevBounds)) {
        setPrevBounds(props.bounds);
        setCameraPosition(undefined);
    }

    const handleCameraChange = React.useCallback(
        function handleCameraChange(viewport: ViewStateType): void {
            if (props.userCameraInteractionActive || props.userCameraInteractionActive === undefined) {
                setCameraPosition(viewport);
            }
        },
        [props.userCameraInteractionActive]
    );

    return <SubsurfaceViewer {...props} cameraPosition={cameraPosition} getCameraPosition={handleCameraChange} />;
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
            } else {
                adjustedColor = [0, 0, 255, color[3]];
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
