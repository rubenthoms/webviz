import { ModuleRegistry } from "@framework/ModuleRegistry";

import { CallbackProperties } from "./callbackInterface";
import { State } from "./state";
import { view } from "./view";

const module = ModuleRegistry.initSubModule<State, CallbackProperties>("MySubModule", {});

module.viewFC = view;
