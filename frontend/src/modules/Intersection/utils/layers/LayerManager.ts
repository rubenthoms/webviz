import React from "react";

import { BaseLayer } from "./BaseLayer";

export function useLayersData(layers: BaseLayer<any, any>[]): any {
    return layers.map((layer) => layer.getData());
}
