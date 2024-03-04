export const MODULE_SERIALIZED_STATE = {
    properties: {
        type: {
            type: "string",
        },
        gradientType: {
            type: "string",
        },
        option: {
            type: "string",
        },
    },
} as const;

export type ModuleSerializedState = typeof MODULE_SERIALIZED_STATE;
