import { SurfaceContext } from "./SurfaceContext";
import { SurfaceSettings } from "./types";

import { LayerDelegate } from "../../LayerDelegate";
import { Layer } from "../../interfaces";

export class SurfaceLayer implements Layer<SurfaceSettings> {
    private _layerDelegate: LayerDelegate<SurfaceSettings>;

    constructor() {
        this._layerDelegate = new LayerDelegate("Surface", new SurfaceContext());
    }

    getId() {
        return this._layerDelegate.getId();
    }

    getName() {
        return this._layerDelegate.getName();
    }

    getBroker() {
        return this._layerDelegate.getBroker();
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getLayerDelegate(): LayerDelegate<SurfaceSettings> {
        return this._layerDelegate;
    }
}
