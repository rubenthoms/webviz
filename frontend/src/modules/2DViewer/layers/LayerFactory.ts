import { LayerManager } from "@modules/_shared/layers/LayerManager";

import { FaultPolygonLayer } from "./FaultPolygonLayer";
import { PolygonLayer } from "./PolygonLayer";
import { SurfaceLayer } from "./SurfaceLayer";
import { WellboreLayer } from "./WellboreLayer";
import { LayerType } from "./types";

export class LayerFactory {
    static makeLayer(layerType: LayerType, layerManager: LayerManager) {
        switch (layerType) {
            case LayerType.SURFACE:
                return new SurfaceLayer("Surface", layerManager);
            case LayerType.WELLBORE_SMDA:
                return new WellboreLayer("Wells (Drilled)", layerManager);
            case LayerType.FAULT_POLYGON:
                return new FaultPolygonLayer("FaultPolygons", layerManager);
            case LayerType.POLYGON:
                return new PolygonLayer("Field Outline", layerManager);
            default:
                throw new Error("Unknown layer type");
        }
    }
}
