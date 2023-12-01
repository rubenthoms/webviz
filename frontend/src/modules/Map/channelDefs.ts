import { Genre, Type } from "@framework/DataChannelTypes";

export enum Channels {
    GridIJK = "Grid IJK",
}

export const channelDefs = {
    [Channels.GridIJK]: {
        name: "Grid IJK",
        genre: Genre.GridIJK,
        dataType: Type.Number,
    },
} as const;

export type ChannelDefs = typeof channelDefs;
