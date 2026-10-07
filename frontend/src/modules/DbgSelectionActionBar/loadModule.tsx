import { ModuleRegistry } from "@framework/ModuleRegistry";

import { Settings } from "./settings";
import type { Interfaces } from "./shared";
import { View } from "./view";

const module = ModuleRegistry.initModule<Interfaces>("DbgSelectionActionBar", {});

module.viewFC = View;
module.settingsFC = Settings;
