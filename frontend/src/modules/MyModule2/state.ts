import { EnsembleIdent } from "@framework/EnsembleIdent";

import { WellBoreHeader } from "src/api/models/WellBoreHeader";

export type StratigraphyColorMap = { [name: string]: string };

export type State = {
    ensembleIdent: EnsembleIdent | null;
    realizations: number[];
    wellboreHeader: WellBoreHeader | null;
    surfaceAttribute: string;
    surfaceNames: string[];
    stratigraphyColorMap: StratigraphyColorMap;
    visibleLayers: string[];
    visibleStatisticCurves: {
        mean: boolean;
        minMax: boolean;
        p10p90: boolean;
        p50: boolean;
    };
};
