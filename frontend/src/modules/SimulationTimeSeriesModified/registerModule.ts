import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { broadcastChannelsDef } from "./channelDefs";
import { preview } from "./preview";
import { State } from "./state";

ModuleRegistry.registerModule<State>({
    moduleName: "SimulationTimeSeriesModified",
    defaultTitle: "Simulation time series (modified)",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    broadcastChannelsDef,
    preview,
});
