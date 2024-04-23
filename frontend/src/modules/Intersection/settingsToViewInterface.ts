import { BoundingBox3d_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import {
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
} from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    baseStates: {
        showGridlines: boolean;
        gridLayer: number;
        zFactor: number;
        intersectionExtensionLength: number;
        curveFittingEpsilon: number;
    };
    derivedStates: {
        realization: number | null;
        gridModelName: string | null;
        gridModelBoundingBox3d: BoundingBox3d_api | null;
        gridModelParameterName: string | null;
        gridModelParameterDateOrInterval: string | null;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        gridLayer: 1,
        zFactor: 1,
        intersectionExtensionLength: 1000,
        curveFittingEpsilon: 0.1,
    },
    derivedStates: {
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
    },
};
