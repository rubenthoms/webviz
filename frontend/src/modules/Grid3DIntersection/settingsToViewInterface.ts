import { BoundingBox3d_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import {
    selectedEnsembleIdentAtom,
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
    selectedWellboreHeaderAtom,
} from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    baseStates: {};
    derivedStates: {
        ensembleIdent: EnsembleIdent | null;
        realization: number | null;
        gridModelName: string | null;
        gridModelBoundingBox3d: BoundingBox3d_api | null;
        gridModelParameterName: string | null;
        gridModelParameterDateOrInterval: string | null;
        wellboreUuid: string | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {},
    derivedStates: {
        ensembleIdent: (get) => {
            return get(selectedEnsembleIdentAtom);
        },
        realization: (get) => {
            return get(selectedRealizationAtom);
        },
        gridModelName: (get) => {
            return get(selectedGridModelNameAtom);
        },
        gridModelBoundingBox3d: (get) => {
            return get(selectedGridModelBoundingBox3dAtom);
        },
        gridModelParameterName: (get) => {
            return get(selectedGridModelParameterNameAtom);
        },
        gridModelParameterDateOrInterval: (get) => {
            return get(selectedGridModelParameterDateOrIntervalAtom);
        },
        wellboreUuid: (get) => {
            return get(selectedWellboreHeaderAtom);
        },
    },
};
