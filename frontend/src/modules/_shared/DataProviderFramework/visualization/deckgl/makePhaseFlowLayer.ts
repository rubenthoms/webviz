import type { GridCellFluxSettings } from "@modules/3DViewer/DataProviderFramework/customDataProviderImplementations/RealizationGridCellFluxFlowProvider";
import { GridPhaseFluxFlowLayer } from "@modules/_shared/customDeckGlLayers/GridPhaseFluxFlowLayer";
import type { Phase } from "@modules/_shared/types/grid";

import { Setting } from "../../settings/settingsDefinitions";
import type { GridCellFluxData } from "../utils/types";
import type { TransformerArgs } from "../VisualizationAssembler";

export function makePhaseFlowLayer({
    id,
    getData,
    getSetting,
}: TransformerArgs<GridCellFluxSettings, GridCellFluxData>) {
    const data = getData();
    const phase = getSetting(Setting.PHASE) ?? "oil";
    const showIndices = getSetting(Setting.SHOW_CELL_INDICES) ?? false;
    const showWireFrame = getSetting(Setting.SHOW_GRID_LINES) ?? false;
    const showVelocity = getSetting(Setting.SHOW_CELL_VELOCITY) ?? false;
    const numParticles = getSetting(Setting.PARTICLE_AMOUNT) ?? 500_000;
    const velocityScale = getSetting(Setting.VELOCITY_SCALE) ?? 1;

    return new GridPhaseFluxFlowLayer({
        id: id,
        data: data,
        phase: phase as Phase,
        numParticles: numParticles,
        velocityScale: velocityScale,
        debug: { wireframe: showWireFrame, index: showIndices, neighborIndex: showIndices, velocity: showVelocity },
    });
}
