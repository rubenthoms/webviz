import { Ensemble } from "./Ensemble";

import { SettingsContext } from "../SettingsContext";

export class SurfaceContext extends SettingsContext {
    constructor() {
        super([new Ensemble()]);
    }
}
