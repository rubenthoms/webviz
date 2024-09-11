import { Layer } from "@deck.gl/core/typed";
import { SurfaceDataFloat_trans } from "@modules/_shared/Surface/queryDataTransforms";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { ObservedSurfaceLayer } from "../layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationSurfaceLayer } from "../layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
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
