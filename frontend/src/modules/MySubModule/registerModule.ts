import { ModuleRegistry } from "@framework/ModuleRegistry";

import { CallbackProperties } from "./callbackInterface";
import { State } from "./state";

ModuleRegistry.registerSubModule<State, CallbackProperties>("MySubModule");
