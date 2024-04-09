import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { selectedEnsembleIdentAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    baseStates: {};
    derivedStates: {
        selectedEnsembleIdent: EnsembleIdent | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {},
    derivedStates: {
        selectedEnsembleIdent: (get) => {
            return get(selectedEnsembleIdentAtom);
        },
    },
};
