import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleType } from "@lib/utils/ColorScale";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    type: ColorScaleType.Discrete,
    min: 0,
    max: 18,
    divMidPoint: 9,
};

const module = ModuleRegistry.initModule<State>("MyModule", defaultState);

module.viewFC = View;
module.settingsFC = Settings;
