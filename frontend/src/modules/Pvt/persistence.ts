import { ColorBy, PhaseType, PressureDependentVariable } from "./typesAndEnums";

export const MODULE_SERIALIZED_STATE = {
    properties: {
        colorBy: {
            enum: [ColorBy.ENSEMBLE, ColorBy.PVT_NUM],
        },
        ensembleIdents: {
            elements: {
                type: "string",
            },
        },
        realizations: {
            elements: {
                type: "uint16",
            },
        },
        pvtNums: {
            elements: {
                type: "uint8",
            },
        },
        phase: {
            enum: [PhaseType.OIL, PhaseType.GAS, PhaseType.WATER],
        },
        dependentVariables: {
            elements: {
                enum: [
                    PressureDependentVariable.FORMATION_VOLUME_FACTOR,
                    PressureDependentVariable.DENSITY,
                    PressureDependentVariable.VISCOSITY,
                    PressureDependentVariable.FLUID_RATIO,
                ],
            },
        },
    },
} as const;

export type ModuleSerializedState = typeof MODULE_SERIALIZED_STATE;
