import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_NAME } from "./registerModule";
import { Settings } from "./settings";

const module = ModuleRegistry.initModule(MODULE_NAME, {});

module.settingsFC = Settings;
