import { PolygonData_api } from "@api";
import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ObservedSurfaceLayer } from "../layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationFaultPolygonsLayer } from "../layers/implementations/layers/RealizationFaultPolygonsLayer/RealizationFaultPolygonsLayer";
import { RealizationSurfaceLayer } from "../layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "../layers/implementations/layers/StatisticalSurfaceLayer/StatisticalSurfaceLayer";
import { Layer as LayerInterface } from "../layers/interfaces";

export function makeLayer(layer: LayerInterface<any, any>): Layer | null {
    const data = layer.getLayerDelegate().getData();
    if (!data) {
        return null;
    }
    if (layer instanceof ObservedSurfaceLayer) {
        return createMapFloatLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof RealizationSurfaceLayer) {
        return createMapFloatLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof StatisticalSurfaceLayer) {
        return createMapFloatLayer(data, layer.getItemDelegate().getId());
    }
    if (layer instanceof RealizationFaultPolygonsLayer) {
        return createFaultPolygonsLayer(data, layer.getItemDelegate().getId());
    }

    return null;
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
