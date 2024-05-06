import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import {
    GridLayer,
    LAYER_TYPE_TO_STRING_MAPPING,
    Layer,
    LayerActionType,
    LayerActions,
    LayerType,
    SeismicDataType,
    SeismicLayer,
    SeismicSurveyType,
} from "@modules/Intersection/typesAndEnums";

import { Getter, atom } from "jotai";
import { atomWithReducer } from "jotai/utils";
import { cloneDeep } from "lodash";
import { v4 } from "uuid";

import { availableSeismicAttributesAtom, availableSeismicDateOrIntervalStringsAtom } from "./derivedAtoms";
import { gridModelInfosQueryAtom } from "./queryAtoms";

export const layersAccessAtom = atom<Layer[]>((get) => {
    const layers = get(layersAtom);
    const adjustedLayers: Layer[] = [];

    for (const layer of layers) {
        if (layer.type === LayerType.GRID) {
            adjustedLayers.push(fixupGridLayer(layer as GridLayer, get));
        }
        if (layer.type === LayerType.SEISMIC) {
            adjustedLayers.push(fixupSeismicLayer(layer as SeismicLayer, get));
        }
    }

    return adjustedLayers;
});

function fixupGridLayer(layer: GridLayer, get: Getter): GridLayer {
    const gridModelInfos = get(gridModelInfosQueryAtom);
    const adjustedSettings = cloneDeep(layer.settings);

    if (!gridModelInfos.data) {
        return layer;
    }

    const gridModelInfo = gridModelInfos.data.find((info) => info.grid_name === layer.settings.modelName);

    if (
        layer.settings.modelName === null ||
        !gridModelInfos.data.map((gridModelInfo) => gridModelInfo.grid_name).includes(layer.settings.modelName)
    ) {
        adjustedSettings.modelName = gridModelInfos.data[0]?.grid_name || null;
    }

    if (adjustedSettings.modelName) {
        if (
            layer.settings.parameterName === null ||
            !gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                ?.property_info_arr.some((propertyInfo) => propertyInfo.property_name === layer.settings.parameterName)
        ) {
            adjustedSettings.parameterName =
                gridModelInfos.data.find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                    ?.property_info_arr[0]?.property_name || null;
        }
    }

    if (adjustedSettings.modelName && adjustedSettings.parameterName) {
        if (
            layer.settings.parameterDateOrInterval === null ||
            !gridModelInfos.data
                .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                ?.property_info_arr.some(
                    (propertyInfo) =>
                        propertyInfo.property_name === adjustedSettings.parameterName &&
                        propertyInfo.iso_date_or_interval === layer.settings.parameterDateOrInterval
                )
        ) {
            adjustedSettings.parameterDateOrInterval =
                gridModelInfos.data
                    .find((gridModelInfo) => gridModelInfo.grid_name === adjustedSettings.modelName)
                    ?.property_info_arr.find(
                        (propertyInfo) => propertyInfo.property_name === adjustedSettings.parameterName
                    )?.iso_date_or_interval || null;
        }
    }

    let boundingBox = cloneDeep(layer.boundingBox);
    if (gridModelInfo) {
        boundingBox = {
            x: [gridModelInfo.bbox.xmin, gridModelInfo.bbox.xmax],
            y: [gridModelInfo.bbox.ymin, gridModelInfo.bbox.ymax],
        };
    }

    return {
        ...layer,
        settings: adjustedSettings,
        boundingBox,
    };
}

function fixupSeismicLayer(layer: SeismicLayer, get: Getter): SeismicLayer {
    const adjustedSettings = cloneDeep(layer.settings);
    const availableSeismicAttributes = get(availableSeismicAttributesAtom);
    const availableSeismicDateOrIntervalStrings = get(availableSeismicDateOrIntervalStringsAtom);

    if (!availableSeismicAttributes.some((el) => el === layer.settings.attribute) || !layer.settings.attribute) {
        adjustedSettings.attribute = availableSeismicAttributes[0] || null;
    }

    if (
        !availableSeismicDateOrIntervalStrings.some((el) => el === layer.settings.dateOrInterval) ||
        !layer.settings.dateOrInterval
    ) {
        adjustedSettings.dateOrInterval = availableSeismicDateOrIntervalStrings[0] || null;
    }

    return {
        ...layer,
        settings: adjustedSettings,
    };
}

function makeInitialLayerSettings(type: LayerType): Record<string, unknown> {
    switch (type) {
        case LayerType.GRID:
            return {
                modelName: null,
                parameterName: null,
                parameterDateOrInterval: null,
                colorScale: new ColorScale({
                    colorPalette: new ColorPalette({
                        name: "Blue to Yellow",
                        colors: [
                            "#115f9a",
                            "#1984c5",
                            "#22a7f0",
                            "#48b5c4",
                            "#76c68f",
                            "#a6d75b",
                            "#c9e52f",
                            "#d0ee11",
                            "#f4f100",
                        ],
                        id: "blue-to-yellow",
                    }),
                    gradientType: ColorScaleGradientType.Sequential,
                    type: ColorScaleType.Continuous,
                    steps: 10,
                }),
            };
        case LayerType.SEISMIC:
            return {
                surveyType: SeismicSurveyType.THREE_D,
                dataType: SeismicDataType.SIMULATED,
                attribute: null,
                dateOrInterval: null,
            };
        default:
            return {};
    }
}

export const layersAtom = atomWithReducer<Layer[], LayerActions>([], (prev: Layer[], action: LayerActions) => {
    switch (action.type) {
        case LayerActionType.ADD_LAYER:
            let potentialName = LAYER_TYPE_TO_STRING_MAPPING[action.payload.type];
            let i = 1;
            while (prev.some((layer) => layer.name === potentialName)) {
                potentialName = `${LAYER_TYPE_TO_STRING_MAPPING[action.payload.type]} (${i})`;
                i++;
            }
            return [
                ...prev,
                {
                    name: potentialName,
                    id: v4(),
                    visible: true,
                    type: action.payload.type,
                    showSettings: false,
                    settings: makeInitialLayerSettings(action.payload.type),
                    boundingBox: { x: [0, 1], y: [0, 1] },
                },
            ];
        case LayerActionType.REMOVE_LAYER:
            return prev.filter((layer) => layer.id !== action.payload.id);
        case LayerActionType.TOGGLE_LAYER_VISIBILITY:
            return prev.map((layer) =>
                layer.id === action.payload.id ? { ...layer, visible: !layer.visible } : layer
            );
        case LayerActionType.TOGGLE_LAYER_SETTINGS_VISIBILITY:
            return prev.map((layer) =>
                layer.id === action.payload.id ? { ...layer, showSettings: !layer.showSettings } : layer
            );
        case LayerActionType.UPDATE_SETTING:
            return prev.map((layer) =>
                layer.id === action.payload.id
                    ? { ...layer, settings: { ...layer.settings, ...action.payload.settings } }
                    : layer
            );
        default:
            return prev;
    }
});
