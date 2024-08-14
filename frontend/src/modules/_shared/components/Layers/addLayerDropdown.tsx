import React from "react";

import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown } from "@mui/icons-material";

import { LayerFactory } from "./layersPanel";

export type AddLayerDropdownProps<TLayerType extends string> = {
    parent: LayerGroup | LayerManager;
    layerTypeToStringMapping: Record<TLayerType, string>;
    layerFactory: LayerFactory<TLayerType>;
};

export function AddLayerDropdown<TLayerType extends string>(props: AddLayerDropdownProps<TLayerType>): React.ReactNode {
    function handleAddLayer(type: TLayerType) {
        props.parent.addLayer(props.layerFactory.makeLayer(type));
    }

    return (
        <Dropdown>
            <MenuButton>
                <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2 whitespace-nowrap">
                    <Add fontSize="inherit" />
                    <span>Add layer</span>
                    <ArrowDropDown fontSize="inherit" />
                </div>
            </MenuButton>
            <Menu anchorOrigin="bottom-end" className="text-sm p-1">
                {Object.keys(props.layerTypeToStringMapping).map((layerType, index) => {
                    return (
                        <MenuItem
                            key={index}
                            className="text-sm p-0.5"
                            onClick={() => handleAddLayer(layerType as TLayerType)}
                        >
                            {props.layerTypeToStringMapping[layerType as TLayerType]}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Dropdown>
    );
}
