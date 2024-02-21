import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { JTDDataType } from "ajv/dist/jtd";
import { Atom, Getter, WritableAtom } from "jotai";

import { gradientTypeAtom } from "./atoms";
import { State } from "./state";

export const MODULE_SERIALIZED_STATE = {
    properties: {
        type: {
            type: "string",
        },
        gradientType: {
            type: "string",
        },
    },
} as const;

export type ModuleSerializedState = JTDDataType<typeof MODULE_SERIALIZED_STATE>;

export function deserializeModuleState(
    data: ModuleSerializedState,
    setStateValue: <T extends keyof State>(key: T, value: State[T]) => void,
    setAtomValue: <Value_1, Args extends unknown[], Result>(
        atom: WritableAtom<Value_1, Args, Result>,
        ...args: Args
    ) => Result
): void {
    setStateValue("type", data.type as ColorScaleType);
    setAtomValue(gradientTypeAtom, data.gradientType as ColorScaleGradientType);
}

export function serializeModuleState(
    getStateValue: <T extends keyof State>(key: T) => State[T],
    get: Getter
): ModuleSerializedState {
    return {
        type: getStateValue("type"),
        gradientType: get(gradientTypeAtom),
    };
}
