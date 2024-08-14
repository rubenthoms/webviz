import { LayerManager } from "@modules/_shared/layers/LayerManager";

import { GridLayer } from "./GridLayer";
import { SeismicLayer } from "./SeismicLayer";
import { SurfaceLayer } from "./SurfaceLayer";
import { SurfacesUncertaintyLayer } from "./SurfacesUncertaintyLayer";
import { WellpicksLayer } from "./WellpicksLayer";
import { LayerType } from "./types";

export class LayerFactory {
    static makeLayer(layerType: LayerType, layerManager: LayerManager) {
        switch (layerType) {
            case LayerType.GRID:
                return new GridLayer("Grid", layerManager);
            case LayerType.SEISMIC:
                return new SeismicLayer("Seismic", layerManager);
            case LayerType.SURFACES:
                return new SurfaceLayer("Surfaces", layerManager);
            case LayerType.WELLPICKS:
                return new WellpicksLayer("Well picks", layerManager);
            case LayerType.SURFACES_UNCERTAINTY:
                return new SurfacesUncertaintyLayer("Surfaces uncertainty", layerManager);
            default:
                throw new Error("Unknown layer type");
        }
    }
}
