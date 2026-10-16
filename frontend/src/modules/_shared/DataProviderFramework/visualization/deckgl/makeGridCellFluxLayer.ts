import { GridCellFluxLayer } from "@modules/_shared/customDeckGlLayers/GridCellFluxLayer";
import { Setting } from "@modules/_shared/DataProviderFramework/settings/settingsDefinitions";
import type { TransformerArgs } from "@modules/_shared/DataProviderFramework/visualization/VisualizationAssembler";

import type { GridCellFluxData } from "../utils/types";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const gridCellFluxSettings = [
    Setting.FLUX_PHASES_SHOWN,
    Setting.FLUX_DIRECTIONS_SHOWN,
    Setting.SHOW_GRID_POINTS,
    Setting.SHOW_GRID_PILLARS,
    Setting.SHOW_CELL_INDICES,
    Setting.OPACITY_PERCENT,
] as const;
type GridCellFluxLayerSettings = typeof gridCellFluxSettings;

export function makeGridCellFluxLayer(
    args: TransformerArgs<GridCellFluxLayerSettings, GridCellFluxData>,
): GridCellFluxLayer | null {
    const { id, getData, getSetting } = args;
    const data = getData();
    const phasesShown = getSetting(Setting.FLUX_PHASES_SHOWN);
    const directionsShown = getSetting(Setting.FLUX_DIRECTIONS_SHOWN);
    const showGridPoints = getSetting(Setting.SHOW_GRID_POINTS) ?? false;
    const showGridPillars = getSetting(Setting.SHOW_GRID_PILLARS) ?? false;
    const showCellIndices = getSetting(Setting.SHOW_CELL_INDICES) ?? false;
    const opacityPercent = getSetting(Setting.OPACITY_PERCENT) ?? 30;

    if (!data) {
        return null;
    }
    console.log(data);

    return new GridCellFluxLayer({
        id: id,
        data: data,
        phasesShown: phasesShown ?? undefined,
        directionsShown: directionsShown ?? undefined,
        showCellCornerPoints: showGridPoints,
        showPillarPoints: showGridPoints,
        showPillars: showGridPillars,
        showCellIndices: showCellIndices,
        opacity: opacityPercent / 100,
    });
}
