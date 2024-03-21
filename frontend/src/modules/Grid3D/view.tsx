import React from "react";

import { WellBoreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { ContinuousLegend } from "@emerson-eps/color-tables";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { useFirstEnsembleInEnsembleSet } from "@framework/WorkbenchSession";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import {
    createContinuousColorScaleForMap,
    createNorthArrowLayer,
    createWellBoreHeaderLayer,
    createWellboreTrajectoryLayer,
} from "@modules/SubsurfaceMap/_utils";
import { wellTrajectoryToGeojson } from "@modules/SubsurfaceMap/_utils/subsurfaceMap";
import { SyncedSubsurfaceViewer } from "@modules/SubsurfaceMap/components/SyncedSubsurfaceViewer";
import { useFieldWellsTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import {
    EsvIntersectionHoverEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { ReadoutItem } from "@modules/_shared/components/EsvIntersection/interaction/types";
import { FenceMeshSection } from "@modules/_shared/components/EsvIntersection/layers/PolylineIntersectionLayer";
import SubsurfaceViewer, { ViewStateType, ViewportType } from "@webviz/subsurface-viewer";
import { ViewAnnotation } from "@webviz/subsurface-viewer/dist/components/ViewAnnotation";
import {
    AxesLayer,
    Grid3DLayer,
    NorthArrow3DLayer,
    PointsLayer,
    PolylinesLayer,
    WellsLayer,
} from "@webviz/subsurface-viewer/dist/layers/";

import { FeatureCollection } from "geojson";
import { isEqual } from "lodash";

import { useGridPolylineIntersection, useGridProperty, useGridSurface } from "./queryHooks";
import state, { Point } from "./state";

type WorkingGrid3dLayer = {
    pointsData: Float32Array;
    polysData: Uint32Array;
    propertiesData: Float32Array;
    colorMapName: string;
    ZIncreasingDownwards: boolean;
} & Layer;
export function View({ moduleContext, workbenchSettings, workbenchServices, workbenchSession }: ModuleFCProps<state>) {
    const myInstanceIdStr = moduleContext.getInstanceIdString();
    const viewIds = {
        view: `${myInstanceIdStr}--view`,
        annotation: `${myInstanceIdStr}--annotation`,
    };
    // From Workbench
    const firstEnsemble = useFirstEnsembleInEnsembleSet(workbenchSession);

    // State
    const gridName = moduleContext.useStoreValue("gridName");
    const parameterName = moduleContext.useStoreValue("parameterName");
    const realization = moduleContext.useStoreValue("realization");
    const boundingBox = moduleContext.useStoreValue("boundingBox");
    const polyLine = moduleContext.useStoreValue("polyLine");

    const singleKLayer = moduleContext.useStoreValue("singleKLayer");
    const selectedWellUuids = moduleContext.useStoreValue("selectedWellUuids");
    const showGridLines = moduleContext.useStoreValue("showGridLines");
    const zScale = moduleContext.useStoreValue("zScale");
    const colorScale = workbenchSettings.useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential });
    const colorTables = createContinuousColorScaleForMap(colorScale);

    const [ris, setRis] = React.useState<IntersectionReferenceSystem | null>(null);
    const [prevPolyLine, setPrevPolyLine] = React.useState<Point[]>([]);
    let viewport: [number, number, number] = [0, 0, 0];

    const [pointLayer, setPointLayer] = React.useState<PointsLayer>(
        new PointsLayer({
            "@@type": "PointsLayer",
            id: "point-layer",
            depthTest: false,
            name: "Point",
            pointsData: [],
            color: [255, 0, 0, 255],
            pointRadius: 20,
            ZIncreasingDownwards: true,
            radiusUnits: "pixels",
        })
    );

    if (!isEqual(polyLine, prevPolyLine)) {
        setPrevPolyLine(polyLine);
        const referenceSystem = new IntersectionReferenceSystem(polyLine.map((point) => [point.x, point.y, 0]));
        setRis(referenceSystem);
    }

    const bounds = boundingBox
        ? [boundingBox.xmin, boundingBox.ymin, boundingBox.zmin, boundingBox.xmax, boundingBox.ymax, boundingBox.zmax]
        : [0, 0, 0, 100, 100, 100];

    const northArrowLayer = new NorthArrow3DLayer({
        id: "north-arrow-layer",
        visible: true,
    });
    const axesLayer = new AxesLayer({
        id: "axes-layer",
        bounds: bounds as [number, number, number, number, number, number],
        visible: true,
        ZIncreasingDownwards: true,
    });

    const layers: Layer[] = [northArrowLayer, axesLayer];

    const esvLayers: LayerItem<any>[] = [];

    // Polyline
    const polyLinePoints: number[] = [];
    polyLine.forEach((point) => {
        polyLinePoints.push(point.x);
        polyLinePoints.push(point.y);
    });
    if (polyLinePoints.length > 0) {
        const polyLineLayer = new GeoJsonLayer({
            id: "polyline-layer",
            data: polyLineToGeojsonLineString(polyLinePoints),
            pickable: true,
            stroked: false,
            filled: true,
            lineWidthScale: 20,
            lineWidthMinPixels: 2,
        });
        layers.push(polyLineLayer);
    }

    // Wells
    const wellTrajectoriesQuery = useFieldWellsTrajectoriesQuery(firstEnsemble?.getCaseUuid() ?? undefined);
    if (wellTrajectoriesQuery.data) {
        const wellTrajectories: WellBoreTrajectory_api[] = wellTrajectoriesQuery.data.filter((well) =>
            selectedWellUuids.includes(well.wellbore_uuid)
        );

        const wellLayerDataFeatures = wellTrajectories.map((well) => wellTrajectoryToGeojson(well));
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
    }

    // Grid surface
    const gridSurfaceQuery = useGridSurface(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        realization,
        singleKLayer
    );
    const gridParameterQuery = useGridProperty(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        singleKLayer
    );
    if (gridSurfaceQuery.data && gridParameterQuery.data) {
        const offsetXyz = [gridSurfaceQuery.data.origin_utm_x, gridSurfaceQuery.data.origin_utm_y, 0];
        const pointsNumberArray = gridSurfaceQuery.data.pointsFloat32Arr.map((val, i) => val + offsetXyz[i % 3]);
        const polysNumberArray = gridSurfaceQuery.data.polysUint32Arr;
        const grid3dLayer = new Grid3DLayer({
            id: "grid-3d-layer",
            pointsData: pointsNumberArray,
            polysData: polysNumberArray,
            propertiesData: gridParameterQuery.data.polyPropsFloat32Arr,
            colorMapName: "Continuous",
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
        });
        layers.push(grid3dLayer as unknown as WorkingGrid3dLayer);
    }

    // Grid intersection
    const gridPolylineIntersectionQuery = useGridPolylineIntersection(
        firstEnsemble?.getCaseUuid() ?? null,
        firstEnsemble?.getEnsembleName() ?? null,
        gridName,
        parameterName,
        realization,
        polyLinePoints
    );

    if (gridPolylineIntersectionQuery.data) {
        // Calculate sizes of typed arrays
        let totalPoints = 0;
        let totalPolys = 0;
        let totalProps = 0;

        gridPolylineIntersectionQuery.data.fence_mesh_sections.forEach((section) => {
            totalPoints += (section.vertices_uz_arr.length / 2) * 3; // divid by uz and multiply by xyz
            totalPolys += section.polys_arr.length;
            totalProps += section.poly_props_arr.length;
        });

        const pointsFloat32Arr = new Float32Array(totalPoints);
        const polysUint32Arr = new Uint32Array(totalPolys);
        const polyPropsFloat32Arr = new Float32Array(totalProps);

        let pointsIndex = 0;
        let polysIndex = 0;
        let propsIndex = 0;

        gridPolylineIntersectionQuery.data.fence_mesh_sections.forEach((section) => {
            // uv to xyz
            const directionX = section.end_utm_x - section.start_utm_x;
            const directionY = section.end_utm_y - section.start_utm_y;
            const magnitude = Math.sqrt(directionX ** 2 + directionY ** 2);
            const unitDirectionX = directionX / magnitude;
            const unitDirectionY = directionY / magnitude;

            for (let i = 0; i < section.vertices_uz_arr.length; i += 2) {
                const u = section.vertices_uz_arr[i];
                const z = section.vertices_uz_arr[i + 1];
                const x = u * unitDirectionX + section.start_utm_x;
                const y = u * unitDirectionY + section.start_utm_y;

                pointsFloat32Arr[pointsIndex++] = x;
                pointsFloat32Arr[pointsIndex++] = y;
                pointsFloat32Arr[pointsIndex++] = z;
            }
            // Fix poly indexes for each section
            let polyIndex = 0;
            while (polyIndex < section.polys_arr.length) {
                const count = section.polys_arr[polyIndex++];
                polysUint32Arr[polysIndex++] = count;

                for (let j = 0; j < count; j++) {
                    polysUint32Arr[polysIndex++] =
                        section.polys_arr[polyIndex++] + (pointsIndex / 3 - section.vertices_uz_arr.length / 2);
                }
            }

            section.poly_props_arr.forEach((prop) => {
                polyPropsFloat32Arr[propsIndex++] = prop;
            });
        });

        const grid3dIntersectionLayer = new Grid3DLayer({
            id: "grid-3d-intersection-layer",
            pointsData: pointsFloat32Arr,
            polysData: polysUint32Arr,
            propertiesData: polyPropsFloat32Arr,
            colorMapName: "Continuous",
            ZIncreasingDownwards: false,
            gridLines: showGridLines,
        });
        layers.push(grid3dIntersectionLayer as unknown as WorkingGrid3dLayer);

        const polyline3d: number[] = [];
        for (let i = 0; i < polyLinePoints.length; i += 2) {
            polyline3d.push(polyLinePoints[i]);
            polyline3d.push(polyLinePoints[i + 1]);
            polyline3d.push(1600);
        }

        const polylineLayer = new PolylinesLayer({
            id: "polyline-layer-2",
            polylinePoints: polyline3d,
            startIndices: [0],
            color: [0, 0, 0],
            linesWidth: 3,
            widthUnits: "pixels",
            ZIncreasingDownwards: true,
        });

        layers.push(polylineLayer);

        const fenceMeshSections: FenceMeshSection[] = [];
        for (const fenceMeshSection of gridPolylineIntersectionQuery.data.fence_mesh_sections) {
            fenceMeshSections.push({
                startUtmX: fenceMeshSection.start_utm_x,
                startUtmY: fenceMeshSection.start_utm_y,
                endUtmX: fenceMeshSection.end_utm_x,
                endUtmY: fenceMeshSection.end_utm_y,
                verticesUzArr: new Float32Array(
                    fenceMeshSection.vertices_uz_arr.map((el, index) => (index % 2 === 0 ? el : -el))
                ),
                polysArr: new Uint32Array(fenceMeshSection.polys_arr),
                polyPropsArr: new Float32Array(fenceMeshSection.poly_props_arr),
                polySourceCellIndicesArr: new Uint32Array(fenceMeshSection.poly_source_cell_indices_arr),
                minZ: fenceMeshSection.vertices_uz_arr.reduce(
                    (min, val, i) => (i % 2 === 1 ? Math.min(min, -val) : min),
                    Infinity
                ),
                maxZ: fenceMeshSection.vertices_uz_arr.reduce(
                    (max, val, i) => (i % 2 === 1 ? Math.max(max, -val) : max),
                    -Infinity
                ),
            });
        }

        const firstFenceMeshSection = fenceMeshSections[0];
        const lastFenceMeshSection = fenceMeshSections[fenceMeshSections.length - 1];
        const firstPoint = [firstFenceMeshSection.verticesUzArr[0], firstFenceMeshSection.verticesUzArr[1]];
        const lastPoint = [
            lastFenceMeshSection.verticesUzArr[lastFenceMeshSection.verticesUzArr.length - 2],
            lastFenceMeshSection.verticesUzArr[lastFenceMeshSection.verticesUzArr.length - 1],
        ];
        const center = [
            firstPoint[0] + (lastPoint[0] - firstPoint[0]) / 2,
            firstPoint[1] + (lastPoint[1] - firstPoint[1]) / 2,
        ];

        viewport = [center[0], center[1], lastPoint[0] - firstPoint[0]];

        esvLayers.push({
            id: "grid-3d-intersection-layer",
            type: LayerType.POLYLINE_INTERSECTION,
            hoverable: true,
            options: {
                data: {
                    fenceMeshSections,
                    minGridPropValue: 0,
                    maxGridPropValue: gridPolylineIntersectionQuery.data.max_grid_prop_value,
                    hideGridLines: !showGridLines,
                },
                colorScale,
            },
        });
    }

    const handleEsvHover = React.useCallback(function handleEsvHover(event: EsvIntersectionHoverEvent) {
        const readoutItems = event.readoutItems;

        if (readoutItems.length === 0) {
            return;
        }

        const readoutItem = readoutItems[0];
        const ris = readoutItem.layer.referenceSystem;
        if (ris) {
            const xyPoint = ris.getPosition(readoutItem.point[0]);
            const z = readoutItem.point[1];
            const point = { x: xyPoint[0], y: xyPoint[1], z };

            setPointLayer(
                new PointsLayer({
                    "@@type": "PointsLayer",
                    id: "point-layer",
                    depthTest: false,
                    name: "Point",
                    pointsData: [point.x, point.y, point.z],
                    color: [255, 0, 0, 255],
                    pointRadius: 10,
                    ZIncreasingDownwards: true,
                    radiusUnits: "pixels",
                })
            );
        }
    }, []);

    layers.push(pointLayer);

    return (
        <div className="relative w-full h-full flex flex-col">
            <div className="h-1/2 relative">
                <SyncedSubsurfaceViewer
                    moduleContext={moduleContext}
                    workbenchServices={workbenchServices}
                    id={viewIds.view}
                    bounds={
                        boundingBox
                            ? [boundingBox.xmin, boundingBox.ymin, boundingBox.xmax, boundingBox.ymax]
                            : undefined
                    }
                    colorTables={colorTables}
                    layers={layers}
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
                                    "grid-3d-layer",
                                    "grid-3d-intersection-layer",
                                    "polyline-layer-2",
                                    "point-layer",
                                ],
                            },
                            /*
                            {
                                id: "view_2d",
                                isSync: false,
                                show3D: false,
                                layerIds: [
                                    "north-arrow-layer",
                                    "axes-layer",
                                    "wells-layer",
                                    "polyline-layer",
                                    "grid-3d-layer",
                                ],
                            },
                            {
                                id: "view_3d_intersect",
                                isSync: true,
                                show3D: true,

                                layerIds: ["polyline-layer", "grid-3d-intersection-layer"],
                            },
                            */
                        ],
                    }}
                >
                    {/* {" "}
                <ViewAnnotation id={viewIds.annotation}>
                    <ContinuousLegend
                        colorTables={colorTables}
                        colorName="Continuous"
                        // min={propertyRange ? propertyRange[0] : undefined}
                        // max={propertyRange ? propertyRange[1] : undefined}
                        cssLegendStyles={{ bottom: "0", right: "0" }}
                    />
                </ViewAnnotation> */}
                </SyncedSubsurfaceViewer>
            </div>
            <div className="h-1/2">
                <EsvIntersection
                    showGrid={false}
                    showAxes
                    showAxesLabels
                    intersectionReferenceSystem={ris ?? undefined}
                    layers={esvLayers}
                    bounds={{ x: [0, 5000], y: [0, 3000] }}
                    viewport={viewport}
                    zScale={zScale}
                    onHover={handleEsvHover}
                />
            </div>
        </div>
    );
}

function polyLineToGeojsonLineString(polyLine: number[]): FeatureCollection {
    // Expect an array with even numbers of elements.
    // Each pair of elements is a coordinate.
    const coordinates = [];
    for (let i = 0; i < polyLine.length; i += 2) {
        coordinates.push([polyLine[i], polyLine[i + 1]]);
    }
    return {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coordinates,
                },
                properties: {
                    color: "green", // Custom property to use in styling (optional)
                },
            },
        ],
    };
}
