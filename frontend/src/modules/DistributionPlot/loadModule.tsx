import { ModuleRegistry } from "@framework/ModuleRegistry";

import { settings } from "./settings";
import { PlotType, State } from "./state";
import { subscriberDefs } from "./subscriberDefs";
import { view } from "./view";

const defaultState: State = {
    plotType: PlotType.Histogram,
    numBins: 10,
    orientation: "h",
};

const module = ModuleRegistry.initModule<State, never, typeof subscriberDefs>("DistributionPlot", defaultState);

module.viewFC = view;
module.settingsFC = settings;
