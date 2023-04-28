import { ModuleRegistry } from "@framework/ModuleRegistry";

import { CallbackInterface } from "./callbackInterface";
import { State } from "./state";
import { view } from "./view";

const module = ModuleRegistry.initSubModule<State, CallbackInterface>("MySubModule", {});

module.viewFC = view;
