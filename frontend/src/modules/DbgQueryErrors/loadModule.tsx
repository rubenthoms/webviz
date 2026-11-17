import { ModuleRegistry } from "@framework/ModuleRegistry";

import { View } from "./view";

const module = ModuleRegistry.initModule("DbgQueryErrors", {});

module.viewFC = View;
