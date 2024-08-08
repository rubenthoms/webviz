import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings/settings";
import { SettingsToViewInterface, interfaceInitialization } from "./settingsToViewInterface";
import { State } from "./state";
import { View } from "./view/view";

const module = ModuleRegistry.initModule<State, SettingsToViewInterface>(MODULE_NAME, {}, {}, interfaceInitialization);

module.settingsFC = Settings;
module.viewFC = View;
