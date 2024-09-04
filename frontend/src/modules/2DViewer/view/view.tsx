import React from "react";

import { PolygonData_api, WellboreTrajectory_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { View as DeckGlView } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { wellTrajectoryToGeojson } from "@modules/SubsurfaceMap/_utils/subsurfaceMap";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { BaseLayer, LayerStatus, useLayers, useLayersStatuses } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import { LayerManagerTopic, useLayerManagerTopicValue } from "@modules/_shared/layers/LayerManager";
import { ViewportType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer, { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { Axes2DLayer, MapLayer, WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { Rgb, parse } from "culori";
import { isEqual } from "lodash";

import { Interfaces } from "../interfaces";
import { FaultPolygonLayer } from "../layers/FaultPolygonLayer";
import { PolygonLayer } from "../layers/PolygonLayer";
import { SurfaceLayer } from "../layers/SurfaceLayer";
import { WellboreLayer } from "../layers/WellboreLayer";

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const allItems = useLayerManagerTopicValue(layerManager, LayerManagerTopic.ITEMS_CHANGED);
    const mainGroup = layerManager.getMainGroup();

    const [prevLayerItems, setPrevLayerItems] = React.useState<BaseLayer<any, any>[]>([]);

    const currentLayerItems = allItems.filter((item) => item instanceof BaseLayer) as BaseLayer<any, any>[];
    if (!isEqual(currentLayerItems, prevLayerItems)) {
        setPrevLayerItems(currentLayerItems);
    }

    const layers = useLayers(prevLayerItems);
    const layersStatuses = useLayersStatuses(layers);

    statusWriter.setLoading(layersStatuses.some((status) => status.status === LayerStatus.LOADING));

    const groupLayersMap: Map<string, Layer[]> = new Map();
    const globalLayers: Layer[] = [];

    const items = allItems.filter((item) => item instanceof BaseLayer || item instanceof LayerGroup) as (
        | BaseLayer<any, any>
        | LayerGroup
    )[];

    for (const item of mainGroup.getItems()) {
        if (!(item instanceof BaseLayer) && !(item instanceof LayerGroup)) {
            continue;
        }
        if (!item.getIsVisible()) {
            continue;
        }
        if (item instanceof BaseLayer) {
            const data = item.getData();
            if (data) {
                if (item instanceof SurfaceLayer) {
                    if ("valuesFloat32Arr" in data) {
                        const mapLayer = createMapFloatLayer(data, item.getId());
                        globalLayers.push(mapLayer);
                    }
                }

                if (item instanceof WellboreLayer) {
                    const uuids = item.getSettings().wellboreUuids;
                    const trajectories = data.filter((wellTrajectory: WellboreTrajectory_api) =>
                        uuids.includes(wellTrajectory.wellboreUuid)
                    );
                    const WellsLayer = createWellsLayer(trajectories, item.getId());
                    globalLayers.push(WellsLayer);
                }
                if (item instanceof FaultPolygonLayer) {
                    const faultPolygonLayer = createFaultPolygonsLayer(data, item.getId());
                    globalLayers.push(faultPolygonLayer);
                }
                if (item instanceof PolygonLayer) {
                    const polygonLayer = createPolygonsLayer(data, item.getId(), item.getSettings().color);
                    globalLayers.push(polygonLayer);
                }
            }
        } else if (item instanceof LayerGroup) {
            const layers = item.getItems();
            const groupLayers: Layer[] = [];
            for (const layer of layers) {
                if (!(layer instanceof BaseLayer)) {
                    continue;
                }
                if (!layer.getIsVisible()) {
                    continue;
                }
                const data = layer.getData();
                if (data) {
                    if (layer instanceof SurfaceLayer) {
                        if ("valuesFloat32Arr" in data) {
                            const mapLayer = createMapFloatLayer(data, layer.getId());
                            groupLayers.push(mapLayer);
                        }
                    }

                    if (layer instanceof WellboreLayer) {
                        const uuids = layer.getSettings().wellboreUuids;

                        const trajectories = data.filter((wellTrajectory: WellboreTrajectory_api) =>
                            uuids.includes(wellTrajectory.wellboreUuid)
                        );
                        const WellsLayer = createWellsLayer(trajectories, layer.getId());
                        groupLayers.push(WellsLayer);
                    }

                    if (layer instanceof FaultPolygonLayer) {
                        const faultPolygonLayer = createFaultPolygonsLayer(data, layer.getId());
                        groupLayers.push(faultPolygonLayer);
                    }
                    if (layer instanceof PolygonLayer) {
                        const polygonLayer = createPolygonsLayer(data, layer.getId(), layer.getSettings().color);
                        groupLayers.push(polygonLayer);
                    }
                }
            }
            groupLayersMap.set(item.getName(), groupLayers);
        }
    }

    const numCols = Math.ceil(Math.sqrt(groupLayersMap.size));
    const numRows = Math.ceil(groupLayersMap.size / numCols);

    const viewports: ViewportType[] = [];
    const viewerLayers: Layer[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    for (const [group, layers] of groupLayersMap) {
        viewports.push({
            id: group,
            name: group,
            isSync: true,
            layerIds: [
                ...layers.map((layer) => (layer as unknown as Layer).id),
                ...globalLayers.map((layer) => layer.id),
                "axes",
            ],
        });
        viewerLayers.push(...layers);
        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={group} id={group}>
                <div className="w-full text-center font-bold text-lg">{group}</div>
            </DeckGlView>
        );
    }
    viewerLayers.push(...globalLayers);
    viewerLayers.push(
        new Axes2DLayer({
            id: "axes",
            axisColor: [80, 80, 80],
            backgroundColor: [250, 250, 250],
        })
    );

    const views: ViewsType = {
        layout: [numRows, numCols],
        viewports: viewports,
        showLabel: true,
    };
    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id="deckgl"
                views={views}
                layers={viewerLayers}
                scale={{
                    visible: true,
                    incrementValue: 100,
                    widthPerUnit: 100,
                    cssStyle: {
                        right: 10,
                        top: 10,
                    },
                }}
            >
                {viewportAnnotations}
            </SubsurfaceViewer>
        </div>
    );
}

function createMapFloatLayer(layerData: SurfaceDataFloat_trans, id: string): MapLayer {
    return new MapLayer({
        id: id,
        meshData: layerData.valuesFloat32Arr,
        typedArraySupport: true,
        frame: {
            origin: [layerData.surface_def.origin_utm_x, layerData.surface_def.origin_utm_y],
            count: [layerData.surface_def.npoints_x, layerData.surface_def.npoints_y],
            increment: [layerData.surface_def.inc_x, layerData.surface_def.inc_y],
            rotDeg: layerData.surface_def.rot_deg,
        },
        contours: [0, 100],
        isContoursDepth: true,
        gridLines: false,
        material: true,
        smoothShading: true,
        colorMapName: "Physics",
        parameters: {
            depthTest: false,
        },
        depthTest: false,
    });
}

function createWellsLayer(wellbores: WellboreTrajectory_api[], id: string): WellsLayer {
    const features: Record<string, unknown>[] = wellbores.map((wellTrajectory: WellboreTrajectory_api) => {
        return wellTrajectoryToGeojson(wellTrajectory);
    });
    const featureCollection: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return new WellsLayer({
        id: id,
        data: featureCollection,
        refine: false,
        lineStyle: { width: 4, color: [128, 128, 128] },
        wellHeadStyle: { size: 1 },
        pickable: true,
        autoHighlight: true,
        opacity: 1,
        outline: false,
        lineWidthScale: 1,
        pointRadiusScale: 1,
        // outline: true,
        logRadius: 10,
        logCurves: true,
        visible: true,
        wellNameVisible: false,
        wellNameAtTop: false,
        wellNameSize: 14,
        wellNameColor: [0, 0, 0, 255],
        selectedWell: "@@#editedData.selectedWells", // used to get data from deckgl layer
        depthTest: false,
        ZIncreasingDownwards: true,
        simplifiedRendering: false,
    });
}

function createFaultPolygonsLayer(polygonsData: PolygonData_api[], id: string): GeoJsonLayer {
    const features: Record<string, unknown>[] = polygonsData.map((polygon) => {
        return surfacePolygonsToGeojson(polygon);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    return new GeoJsonLayer({
        id: id,
        data: data,
        opacity: 0.5,
        parameters: {
            depthTest: false,
        },
        depthTest: false,
        pickable: true,
    });
}
function createPolygonsLayer(polygonsData: PolygonData_api[], id: string, hexColor: string): GeoJsonLayer {
    const features: Record<string, unknown>[] = polygonsData.map((polygon) => {
        return surfacePolygonsToGeojson(polygon);
    });
    const data: Record<string, unknown> = {
        type: "FeatureCollection",
        unit: "m",
        features: features,
    };
    const rgbColor = parse(hexColor) as Rgb;
    let rgbArr: [number, number, number] | undefined;
    if (rgbColor && "r" in rgbColor && "g" in rgbColor && "b" in rgbColor) {
        rgbArr = [rgbColor.r * 255, rgbColor.g * 255, rgbColor.b * 255];
    }
    return new GeoJsonLayer({
        id: id,
        data: data,
        opacity: 1,
        getLineWidth: 40,
        getLineColor: rgbArr,
        filled: false,
        parameters: {
            depthTest: false,
        },
        depthTest: false,
        pickable: true,
    });
}
function surfacePolygonsToGeojson(surfacePolygon: PolygonData_api): Record<string, unknown> {
    const data: Record<string, unknown> = {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates: [zipCoords(surfacePolygon.x_arr, surfacePolygon.y_arr, surfacePolygon.z_arr)],
        },
        properties: { name: surfacePolygon.poly_id, color: [0, 0, 0, 255] },
    };
    return data;
}

function zipCoords(x_arr: number[], y_arr: number[], z_arr: number[]): number[][] {
    const coords: number[][] = [];
    for (let i = 0; i < x_arr.length; i++) {
        coords.push([x_arr[i], y_arr[i], -z_arr[i]]);
    }

    return coords;
}
