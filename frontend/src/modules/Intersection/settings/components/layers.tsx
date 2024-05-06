import React from "react";

import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    GridLayer,
    LAYER_TYPE_TO_STRING_MAPPING,
    Layer,
    LayerActionType,
    LayerActions,
    LayerBoundingBox,
    LayerType,
    SeismicLayer,
} from "@modules/Intersection/typesAndEnums";
import { Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    ArrowDropDown,
    Delete,
    ExpandLess,
    ExpandMore,
    Settings,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { useAtomValue, useSetAtom } from "jotai";

import { GridLayerSettings } from "./layerSettings/gridLayer";
import { SeismicLayerSettings } from "./layerSettings/seismicLayer";

import { layersAccessAtom, layersAtom } from "../atoms/layersAtoms";

export type LayersProps = {};

export function Layers(props: LayersProps): React.ReactNode {
    const dispatch = useSetAtom(layersAtom);
    const layers = useAtomValue(layersAccessAtom);

    function handleAddLayer(type: LayerType) {
        dispatch({ type: LayerActionType.ADD_LAYER, payload: { type } });
    }

    function handleRemoveLayer(id: string) {
        dispatch({ type: LayerActionType.REMOVE_LAYER, payload: { id } });
    }

    function handleToggleLayerVisibility(id: string) {
        dispatch({ type: LayerActionType.TOGGLE_LAYER_VISIBILITY, payload: { id } });
    }

    function handleToggleSettingsVisibility(id: string) {
        dispatch({ type: LayerActionType.TOGGLE_LAYER_SETTINGS_VISIBILITY, payload: { id } });
    }

    return (
        <div className="w-full h-full">
            <div className="flex flex-col border border-slate-100">
                {layers.map((layer) => {
                    return (
                        <LayerItem
                            key={layer.id}
                            layer={layer}
                            onRemoveLayer={handleRemoveLayer}
                            onToggleLayerVisibility={handleToggleLayerVisibility}
                            onToggleSettingsVisible={handleToggleSettingsVisibility}
                            dispatch={dispatch}
                        />
                    );
                })}
            </div>
            <div className="flex bg-slate-100">
                <Dropdown>
                    <MenuButton>
                        <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded">
                            <Add fontSize="inherit" />
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </MenuButton>
                    <Menu anchorOrigin="bottom-start" className="text-sm p-1">
                        {Object.keys(LAYER_TYPE_TO_STRING_MAPPING).map((layerType, index) => {
                            return (
                                <MenuItem
                                    key={index}
                                    className="text-sm p-0.5"
                                    onClick={() => handleAddLayer(layerType as LayerType)}
                                >
                                    {LAYER_TYPE_TO_STRING_MAPPING[layerType as LayerType]}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Dropdown>
            </div>
        </div>
    );
}

type LayerItemProps = {
    layer: Layer;
    onRemoveLayer: (id: string) => void;
    onToggleLayerVisibility: (id: string) => void;
    onToggleSettingsVisible: (id: string) => void;
    dispatch: (action: LayerActions) => void;
};

function LayerItem(props: LayerItemProps): React.ReactNode {
    function handleRemoveLayer(id: string) {
        props.onRemoveLayer(id);
    }

    function handleToggleLayerVisibility(id: string) {
        props.onToggleLayerVisibility(id);
    }

    function handleToggleSettingsVisibility(id: string) {
        props.onToggleSettingsVisible(id);
    }

    function makeSettingsContainer(layer: Layer): React.ReactNode {
        function updateBoundingBox(bbox: LayerBoundingBox) {
            props.dispatch({
                type: LayerActionType.UPDATE_BOUNDING_BOX,
                payload: { id: layer.id, boundingBox: bbox },
            });
        }
        if (layer.type === LayerType.GRID) {
            function updateSetting<T extends keyof GridLayer["settings"]>(setting: T, value: GridLayer["settings"][T]) {
                props.dispatch({
                    type: LayerActionType.UPDATE_SETTING,
                    payload: { id: layer.id, settings: { [setting]: value } },
                });
            }
            return (
                <GridLayerSettings
                    layer={layer as GridLayer}
                    updateBoundingBox={updateBoundingBox}
                    updateSetting={updateSetting}
                />
            );
        }
        if (layer.type === LayerType.SEISMIC) {
            function updateSetting<T extends keyof SeismicLayer["settings"]>(
                setting: T,
                value: SeismicLayer["settings"][T]
            ) {
                props.dispatch({
                    type: LayerActionType.UPDATE_SETTING,
                    payload: { id: layer.id, settings: { [setting]: value } },
                });
            }
            return <SeismicLayerSettings layer={layer as SeismicLayer} updateSetting={updateSetting} />;
        }
        return null;
    }

    return (
        <>
            <div
                key={props.layer.id}
                className="flex p-0.5 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300"
            >
                <div
                    className="p-0.5 hover:cursor-pointer hover:bg-blue-100 rounded"
                    onClick={() => handleToggleLayerVisibility(props.layer.id)}
                    title="Toggle visibility"
                >
                    {props.layer.visible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <div className="flex-grow font-bold">{props.layer.name}</div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={() => handleToggleSettingsVisibility(props.layer.id)}
                    title={props.layer.showSettings ? "Hide settings" : "Show settings"}
                >
                    <Settings fontSize="inherit" />
                    {props.layer.showSettings ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={() => handleRemoveLayer(props.layer.id)}
                    title="Remove layer"
                >
                    <Delete fontSize="inherit" />
                </div>
            </div>
            <div
                className={resolveClassNames("border-b border-b-gray-300 p-1 bg-gray-50 shadow-inner", {
                    hidden: !props.layer.showSettings,
                })}
            >
                {makeSettingsContainer(props.layer)}
            </div>
        </>
    );
}
