import { BoundingBox3d_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { InterfaceInitialization } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScale } from "@lib/utils/ColorScale";

import { userSelectedSeismicDataTypeAtom } from "./settings/atoms/baseAtoms";
import {
    selectedCustomIntersectionPolylineIdAtom,
    selectedGridModelBoundingBox3dAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
    selectedSeismicAttributeAtom,
    selectedSeismicDateOrIntervalStringAtom,
} from "./settings/atoms/derivedAtoms";
import { layersAccessAtom } from "./settings/atoms/layersAtoms";
import { selectedEnsembleIdentAtom } from "./sharedAtoms/sharedAtoms";
import { Layer, SeismicDataType } from "./typesAndEnums";

export type SettingsToViewInterface = {
    baseStates: {
        showGridlines: boolean;
        gridLayer: number;
        zFactor: number;
        intersectionExtensionLength: number;
        intersectionType: IntersectionType;
        curveFittingEpsilon: number;
        seismicColorScale: ColorScale | null;
        showSeismic: boolean;
    };
    derivedStates: {
        ensembleIdent: EnsembleIdent | null;
        realization: number | null;
        gridModelName: string | null;
        gridModelBoundingBox3d: BoundingBox3d_api | null;
        gridModelParameterName: string | null;
        gridModelParameterDateOrInterval: string | null;
        seismicAttribute: string | null;
        seismicDateOrIntervalString: string | null;
        seismicDataType: SeismicDataType;
        selectedCustomIntersectionPolylineId: string | null;
        layers: Layer[];
    };
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    baseStates: {
        showGridlines: false,
        gridLayer: 1,
        zFactor: 1,
        intersectionExtensionLength: 1000,
        intersectionType: IntersectionType.WELLBORE,
        curveFittingEpsilon: 5,
        seismicColorScale: null,
        showSeismic: false,
    },
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
        seismicAttribute: (get) => {
            return get(selectedSeismicAttributeAtom);
        },
        seismicDateOrIntervalString: (get) => {
            return get(selectedSeismicDateOrIntervalStringAtom);
        },
        seismicDataType: (get) => {
            return get(userSelectedSeismicDataTypeAtom);
        },
        selectedCustomIntersectionPolylineId: (get) => {
            return get(selectedCustomIntersectionPolylineIdAtom);
        },
        layers: (get) => {
            return get(layersAccessAtom);
        },
    },
};
