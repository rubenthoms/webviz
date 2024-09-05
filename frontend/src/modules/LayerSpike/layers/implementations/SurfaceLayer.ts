import { SurfaceContext } from "./SurfaceContext";

import { LayerBase } from "../LayerBase";

export class SurfaceLayer extends LayerBase {
    constructor() {
        super("Surface", new SurfaceContext());
    }
}
