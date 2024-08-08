import { SurfaceLayer } from "./SurfaceLayer";
import { WellboreLayer } from "./WellboreLayer";
import { LayerType } from "./types";

export class LayerFactory {
    static makeLayer(layerType: LayerType) {
        switch (layerType) {
            case LayerType.SURFACE:
                return new SurfaceLayer("Surface");
            case LayerType.WELLBORE:
                return new WellboreLayer("Wellbore");
            default:
                throw new Error("Unknown layer type");
        }
    }
}
