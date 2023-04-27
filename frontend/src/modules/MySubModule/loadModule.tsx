import { ModuleRegistry } from "@framework/ModuleRegistry";

import { view } from "./view";

const module = ModuleRegistry.initSubModule("MySubModule");

module.viewFC = view;
