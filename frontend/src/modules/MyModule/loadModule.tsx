import { ModuleRegistry } from "@framework/ModuleRegistry";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { fixedUpOptionAtom, gradientTypeAtom, userSelectedOptionAtom } from "./atoms";
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
        const userSelectedOption = getAtomValue(userSelectedOptionAtom);
        return {
            type: getStateValue("type"),
            gradientType: getAtomValue(gradientTypeAtom).value,
            option: userSelectedOption.isPersistedValue ? userSelectedOption.value : getAtomValue(fixedUpOptionAtom),
        };
    },
    (data, setStateValue, setAtomValue) => {
        setStateValue("type", data.type as ColorScaleType);
        setAtomValue(gradientTypeAtom, data.gradientType as ColorScaleGradientType);
        setAtomValue(userSelectedOptionAtom, data.option as string);
    }
);
