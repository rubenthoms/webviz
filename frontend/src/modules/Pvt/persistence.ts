export const MODULE_SERIALIZED_STATE = {
    properties: {
        colorBy: {
            type: "string",
        },
        ensembleIdents: {
            type: "array",
            items: {
                type: "string",
            },
        },
        realizations: {
            type: "array",
            items: {
                type: "number",
            },
        },
        pvtNums: {
            type: "array",
            items: {
                type: "number",
            },
        },
        phase: {
            type: "string",
        },
        plots: {
            type: "array",
            items: {
                type: "string",
            },
        },
    },
} as const;

export type ModuleSerializedState = typeof MODULE_SERIALIZED_STATE;
