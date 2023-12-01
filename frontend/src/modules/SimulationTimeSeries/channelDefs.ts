import { ChannelDefinitions, Genre, Type } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    Realization_Value = "Value (per realization)",
}

export const channelDefs = {
    [BroadcastChannelNames.Realization_Value]: {
        name: "Value (per realization)",
        genre: Genre.Realization,
        dataType: Type.Number,
        metaData: undefined,
    },
} as const;

export type ChannelDefs = typeof channelDefs;
