import { GridPhaseFluxFlowLayer } from "@modules/_shared/customDeckGlLayers/GridPhaseFluxFlowLayer";

import type { GridCellFluxData } from "../utils/types";
import type { TransformerArgs } from "../VisualizationAssembler";

export function makePhaseFlowLayer(args: TransformerArgs<any, GridCellFluxData>) {
    const data = args.getData();

    return new GridPhaseFluxFlowLayer({
        data: data,
        phase: "oil",
    });
}
