import { EnsembleIdent } from "@framework/EnsembleIdent";
import { Wellbore } from "@framework/Wellbore";

export type StratigraphyColorMap = { [name: string]: string };

export type State = {
    ensembleIdent: EnsembleIdent | null;
    realizations: number[];
    wellbore: Wellbore | null;
    surfaceAttribute: string;
    surfaceNames: string[];
    stratigraphyColorMap: StratigraphyColorMap;
    grid: boolean;
    showWellbore: boolean;
    geoModel: boolean;
    geoModelLabels: boolean;
    seismic: boolean;
    schematic: boolean;
    seaAndRbk: boolean;
    picks: boolean;
    axisLabels: boolean;
    polyLineIntersection: boolean;
};
