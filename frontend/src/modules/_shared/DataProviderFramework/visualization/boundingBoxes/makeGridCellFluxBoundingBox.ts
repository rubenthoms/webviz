import type { BBox } from "@lib/utils/bbox";
import { GridCellFluxLayer } from "@modules/_shared/customDeckGlLayers/GridCellFluxLayer";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { GridCellFluxData } from "../utils/types";

export function makeGridCellFluxBoundingBox({ getData }: TransformerArgs<any, GridCellFluxData>): BBox | null {
    // Delegates to the layer itself, which is the single source of truth for its own
    // rendered extent (see computeGridCellFluxBoundingBox in GridCellFluxLayer.ts).
    return GridCellFluxLayer.getBoundingBox(getData());
}
