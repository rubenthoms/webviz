import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleRegistry } from "@framework/ModuleRegistry";

import { MODULE_SERIALIZED_STATE, ModuleSerializedState } from "./persistence";
import { MODULE_NAME } from "./registerModule";
import {
    userSelectedEnsembleIdentsAtom,
    userSelectedPvtNumsAtom,
    userSelectedRealizationsAtom,
} from "./settings/atoms/baseAtoms";
import {
    selectedEnsembleIdentsAtom,
    selectedPvtNumsAtom,
    selectedRealizationsAtom,
} from "./settings/atoms/derivedAtoms";
import { Settings } from "./settings/settings";
import { Interface, State, interfaceHydration } from "./state";
import { View } from "./view";

const defaultState: State = {};

const module = ModuleRegistry.initModule<State, Interface, ModuleSerializedState>(
    MODULE_NAME,
    defaultState,
    {},
    interfaceHydration
);

module.viewFC = View;
module.settingsFC = Settings;

module.registerStateSerializerAndDeserializer(
    (_, getAtomValue, getInterfaceBaseStateValue) => {
        return {
            colorBy: getInterfaceBaseStateValue("selectedColorBy"),
            dependentVariables: getInterfaceBaseStateValue("selectedDependentVariables"),
            phase: getInterfaceBaseStateValue("selectedPhase"),
            ensembleIdents: getAtomValue(userSelectedEnsembleIdentsAtom).isPersistedValue
                ? getAtomValue(userSelectedEnsembleIdentsAtom).value.map((ident) => ident.toString())
                : getAtomValue(selectedEnsembleIdentsAtom).map((ident) => ident.toString()),
            realizations: getAtomValue(userSelectedRealizationsAtom).isPersistedValue
                ? getAtomValue(userSelectedRealizationsAtom).value
                : getAtomValue(selectedRealizationsAtom),
            pvtNums: getAtomValue(selectedPvtNumsAtom),
        };
    },
    (data, _, setAtomValue, setInterfaceBaseStateValue) => {
        setInterfaceBaseStateValue("selectedColorBy", data.colorBy);
        setInterfaceBaseStateValue("selectedDependentVariables", data.dependentVariables);
        setInterfaceBaseStateValue("selectedPhase", data.phase);
        setAtomValue(
            userSelectedEnsembleIdentsAtom,
            data.ensembleIdents.map((ident) => EnsembleIdent.fromString(ident))
        );
        setAtomValue(userSelectedRealizationsAtom, data.realizations);
        setAtomValue(userSelectedPvtNumsAtom, data.pvtNums);
    }
);
