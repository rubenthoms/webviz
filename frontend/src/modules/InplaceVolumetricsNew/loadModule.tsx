import { ModuleRegistry } from "@framework/ModuleRegistry";

import { ChannelDefs } from "./channelDefs";
import { settings } from "./settings";
import { State } from "./state";
import { view } from "./view";

const defaultState: State = {
    selectedEnsembleIdents: [],
    selectedResponseNames: [],
    selectedTableNames: [],
    selectedCategoricalMetadata: [],
};

const module = ModuleRegistry.initModule<State, ChannelDefs>("InplaceVolumetricsNew", defaultState);

module.viewFC = view;
module.settingsFC = settings;
