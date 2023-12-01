import { Genre } from "@framework/DataChannelTypes";
import { ModuleRegistry } from "@framework/ModuleRegistry";
import { SyncSettingKey } from "@framework/SyncSettings";

import { preview } from "./preview";
import { State } from "./state";

const subscriberDefs = {
    ["response"]: {
        name: "Response",
        supportedGenres: [Genre.Realization],
        supportsMultiContents: false,
    },
} as const;

ModuleRegistry.registerModule<State>({
    moduleName: "TornadoChart",
    defaultTitle: "Tornado Chart",
    syncableSettingKeys: [SyncSettingKey.ENSEMBLE, SyncSettingKey.TIME_SERIES],
    preview,
    subscribers: subscriberDefs,
});
