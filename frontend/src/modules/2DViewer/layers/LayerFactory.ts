import { LayerManager } from "@modules/_shared/layers/LayerManager";

import { SurfaceLayer } from "./SurfaceLayer";
import { WellboreLayer } from "./WellboreLayer";
import { LayerType } from "./types";

export class LayerFactory {
    static makeLayer(layerType: LayerType, layerManager: LayerManager) {
        switch (layerType) {
            case LayerType.SURFACE:
                return new SurfaceLayer("Surface", layerManager);
            case LayerType.WELLBORE:
                return new WellboreLayer("Wellbore", layerManager);
            default:
                throw new Error("Unknown layer type");
        }
    }
}
