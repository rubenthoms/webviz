import type { BBox } from "@lib/utils/bbox";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { GridCellFluxData } from "../utils/types";

export function makeGridCellFluxBoundingBox({ getData }: TransformerArgs<any, GridCellFluxData>): BBox | null {
    const data = getData();
    if (!data || data.cellCornersFloat32Arr.length === 0) {
        return null;
    }

    let xmin = Infinity;
    let ymin = Infinity;
    let zmin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;
    let zmax = -Infinity;

    const corners = data.cellCornersFloat32Arr;
    for (let i = 0; i < corners.length; i += 3) {
        const x = corners[i];
        const y = corners[i + 1];
        const z = corners[i + 2];
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    // Z convention here is depth (increasing downward, TVD-style); negate for a Z-up bounding box,
    // same convention as makeRealizationGridBoundingBox.
    return {
        min: { x: xmin, y: ymin, z: -zmax },
        max: { x: xmax, y: ymax, z: -zmin },
    };
}
