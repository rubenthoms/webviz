import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    Layer,
    LayerActionType,
    LayerActions,
    LayerBoundingBox,
    LayerType,
    SeismicLayer,
} from "@modules/Intersection/typesAndEnums";
import { BaseLayer, useIsLayerVisible } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
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

import { GridLayerSettingsComponent } from "./layerSettings/gridLayer";
import { SeismicLayerSettings } from "./layerSettings/seismicLayer";

import { layersAtom } from "../atoms/layersAtoms";

export type LayersProps = {
    ensembleSet: EnsembleSet;
};

export function Layers(props: LayersProps): React.ReactNode {
    const dispatch = useSetAtom(layersAtom);
    const layers = useAtomValue(layersAtom);

    function handleAddLayer(type: LayerType) {
        dispatch({ type: LayerActionType.ADD_LAYER, payload: { type } });
    }

    function handleRemoveLayer(id: string) {
        dispatch({ type: LayerActionType.REMOVE_LAYER, payload: { id } });
    }

    return (
        <div className="w-full h-full">
            <div className="flex flex-col border border-slate-100">
                {layers.map((layer) => {
                    return (
                        <LayerItem
                            key={layer.getId()}
                            layer={layer}
                            ensembleSet={props.ensembleSet}
                            onRemoveLayer={handleRemoveLayer}
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
    layer: BaseLayer<any, any>;
    ensembleSet: EnsembleSet;
    onRemoveLayer: (id: string) => void;
    dispatch: (action: LayerActions) => void;
};

function LayerItem(props: LayerItemProps): React.ReactNode {
    const [showSettings, setShowSettings] = React.useState<boolean>(false);

    const isVisible = useIsLayerVisible(props.layer);

    function handleRemoveLayer(id: string) {
        props.onRemoveLayer(id);
    }

    function handleToggleLayerVisibility() {
        props.layer.setIsVisible(!isVisible);
    }

    function handleToggleSettingsVisibility(id: string) {
        setShowSettings(!showSettings);
    }

    function makeSettingsContainer(layer: BaseLayer<any, any>): React.ReactNode {
        if (props.layer instanceof GridLayer) {
            function updateSetting<T extends keyof GridLayerSettings>(setting: T, value: GridLayerSettings[T]) {
                props.layer.maybeUpdateSettings({ [setting]: value });
            }
            return (
                <GridLayerSettingsComponent
                    ensembleSet={props.ensembleSet}
                    layer={layer as GridLayer}
                    updateSetting={updateSetting}
                />
            );
        }
        return null;
    }

    return (
        <>
            <div
                key={props.layer.getId()}
                className="flex p-0.5 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300"
            >
                <div
                    className="px-0.5 hover:cursor-pointer hover:bg-blue-100 rounded"
                    onClick={handleToggleLayerVisibility}
                    title="Toggle visibility"
                >
                    {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <div className="flex-grow font-bold">{props.layer.getName()}</div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={() => handleToggleSettingsVisibility(props.layer.getId())}
                    title={showSettings ? "Hide settings" : "Show settings"}
                >
                    <Settings fontSize="inherit" />
                    {showSettings ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={() => handleRemoveLayer(props.layer.getId())}
                    title="Remove layer"
                >
                    <Delete fontSize="inherit" />
                </div>
            </div>
            <div
                className={resolveClassNames("border-b border-b-gray-300 p-1 bg-gray-50 shadow-inner", {
                    hidden: !showSettings,
                })}
            >
                {makeSettingsContainer(props.layer)}
            </div>
        </>
    );
}
