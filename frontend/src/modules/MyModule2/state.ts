import { EnsembleIdent } from "@framework/EnsembleIdent";

import { WellBoreHeader } from "src/api/models/WellBoreHeader";

import { SeismicTimeType } from "./utils/seismicCubeDirectory";

export type StratigraphyColorMap = { [name: string]: string };

export enum SeismicDataType {
    SIMULATED = "simulated",
    OBSERVED = "observed",
}

export const SeismicDataTypeTypeToStringMapping = {
    [SeismicDataType.SIMULATED]: "Simulated",
    [SeismicDataType.OBSERVED]: "Observed",
};

export const SeismicTimeTypeEnumToSurveyTypeStringMapping = {
    [SeismicTimeType.TimePoint]: "3D",
    [SeismicTimeType.Interval]: "4D",
};
export const SeismicTimeTypeEnumToSeismicTimeTypeStringMapping = {
    [SeismicTimeType.TimePoint]: "Seismic timestamps",
    [SeismicTimeType.Interval]: "Seismic intervals",
};

export type State = {
    ensembleIdent: EnsembleIdent | null;
    realizations: number[];
    wellboreHeader: WellBoreHeader | null;
    surfaceAttribute: string;
    surfaceNames: string[];
    stratigraphyColorMap: StratigraphyColorMap;
    seismicDataType: SeismicDataType;
    seismicTimeType: SeismicTimeType;
    seismicAttribute: string;
    seismicTimestamp: string;
    visibleLayers: string[];
    visibleStatisticCurves: {
        mean: boolean;
        minMax: boolean;
        p10p90: boolean;
        p50: boolean;
    };
};
