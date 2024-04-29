import { BoundingBox3d_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";

import { userSelectedSeismicDataTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
    selectedSeismicAttributeAtom,
    selectedSeismicDateOrIntervalStringAtom,
} from "./settings/atoms/derivedAtoms";
import { SeismicDataType } from "./typesAndEnums";

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
        seismicAttribute: string | null;
        seismicDateOrIntervalString: string | null;
        seismicDataType: SeismicDataType;
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        gridLayer: 1,
        zFactor: 1,
        intersectionExtensionLength: 1000,
        curveFittingEpsilon: 5,
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
        seismicAttribute: (get) => {
            return get(selectedSeismicAttributeAtom);
        },
        seismicDateOrIntervalString: (get) => {
            return get(selectedSeismicDateOrIntervalStringAtom);
        },
        seismicDataType: (get) => {
            return get(userSelectedSeismicDataTypeAtom);
        },
    },
};
