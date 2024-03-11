import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    grid: true,
    wellbore: true,
    geoModel: true,
    geoModelLabels: true,
    seismic: true,
    schematic: true,
    seaAndRbk: true,
    picks: true,
    axisLabels: true,
    polyLineIntersection: true,
};

const module = ModuleRegistry.initModule<State>("MyModule2", defaultState);

module.viewFC = View;

module.settingsFC = Settings;
