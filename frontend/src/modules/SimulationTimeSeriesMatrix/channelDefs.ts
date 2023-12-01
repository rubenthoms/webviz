import { Genre, Type } from "@framework/DataChannelTypes";

export enum BroadcastChannelNames {
    TimeSeries = "TimeSeries (with value per realization)",
}

export const channelDefs = {
    [BroadcastChannelNames.TimeSeries]: {
        name: "TimeSeries (with value per realization)",
        genre: Genre.Realization,
        dataType: Type.Number,
        metaData: {
            ensemble: Type.String,
            unit: Type.String,
        },
    },
} as const;

export type ChannelDefs = typeof channelDefs;
