import { ModuleRegistry } from "@framework/ModuleRegistry";

import { CallbackInterface } from "./callbackInterface";
import { State } from "./state";

ModuleRegistry.registerSubModule<State, CallbackInterface>("MySubModule");
