import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { gradientTypeAtom, optionAtom } from "./atoms";
import { ModuleSerializedState } from "./persistence";
import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";

const defaultState: State = {
    type: ColorScaleType.Discrete,
    min: 0,
    max: 18,
    divMidPoint: 9,
};

const module = ModuleRegistry.initModule<
    State,
    { baseStates: Record<string, never>; derivedStates: Record<string, never> },
    ModuleSerializedState
>("MyModule", defaultState);

module.viewFC = View;
module.settingsFC = Settings;

module.registerStateSerializerAndDeserializer(
    (getStateValue, getAtomValue) => {
        return {
            type: getStateValue("type"),
            gradientType: getAtomValue(gradientTypeAtom),
            option: getAtomValue(optionAtom),
        };
    },
    (data, setStateValue, setAtomValue) => {
        setStateValue("type", data.type as ColorScaleType);
        setAtomValue(gradientTypeAtom, data.gradientType as ColorScaleGradientType);
        setAtomValue(optionAtom, data.option as string);
    }
);
