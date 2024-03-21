import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { SeismicDataType, State } from "./state";
import { SeismicTimeType } from "./utils/seismicCubeDirectory";
import { View } from "./view";

const defaultState: State = {
    ensembleIdent: null,
    realizations: [],
    wellboreHeader: null,
    surfaceAttribute: "",
    surfaceNames: [],
    stratigraphyColorMap: {},
    seismicDataType: SeismicDataType.SIMULATED,
    seismicTimeType: SeismicTimeType.TimePoint,
    seismicAttribute: "",
    seismicTimestamp: "",
    visibleLayers: [],
    visibleStatisticCurves: {
        mean: true,
        minMax: true,
        p10p90: true,
        p50: true,
    },
};

const module = ModuleRegistry.initModule<State>("MyModule2", defaultState);

module.viewFC = View;

module.settingsFC = Settings;
