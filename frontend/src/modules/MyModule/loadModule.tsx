import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { Settings } from "./settings";
import { State } from "./state";
import { View } from "./view";
import { MODULE_SERIALIZED_STATE } from "./persistence";
import { gradientTypeAtom } from "./atoms";

const defaultState: State = {
    type: ColorScaleType.Discrete,
    min: 0,
    max: 18,
    divMidPoint: 9,
};

const module = ModuleRegistry.initModule<State, { baseStates: Record<string, never>; derivedStates: Record<string, never> }, typeof MODULE_SERIALIZED_STATE>("MyModule", defaultState);

module.viewFC = View;
module.settingsFC = Settings;

module.registerStateSerializerAndDeserializer(
    (getStateValue, getAtomValue) => {
        return {
            type: getStateValue("type"),
            gradientType: getAtomValue(gradientTypeAtom),
        };
    },
    (data, setStateValue, setAtomValue) => {
        setStateValue("type", data.type as ColorScaleType);
        setAtomValue(gradientTypeAtom, data.gradientType as ColorScaleGradientType);
    }
)
