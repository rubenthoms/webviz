import { Menu } from "@lib/components/Menu";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown, GridView } from "@mui/icons-material";

export type LayersPanelActionsProps<TLayerType extends string, TSettingType extends string> = {
    layerTypeToStringMapping: Record<TLayerType, string>;
    settingTypeToStringMapping: Record<TSettingType, string>;
    onAddView: () => void;
    onAddLayer: (layerType: TLayerType) => void;
    onAddSharedSetting: (settingType: TSettingType) => void;
};

export function LayersPanelActions<TLayerType extends string, TSettingType extends string>(
    props: LayersPanelActionsProps<TLayerType, TSettingType>
): React.ReactNode {
    return (
        <Dropdown>
            <MenuButton>
                <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2">
                    <Add fontSize="inherit" />
                    <span>Add</span>
                    <ArrowDropDown fontSize="inherit" />
                </div>
            </MenuButton>
            <Menu anchorOrigin="bottom-end" className="text-sm p-1">
                <MenuItem className="text-sm p-0.5 flex gap-2" onClick={props.onAddView}>
                    <GridView fontSize="inherit" className="opacity-50" />
                    View
                </MenuItem>
                <MenuDivider />
                <MenuHeading>Layers</MenuHeading>
                {Object.keys(props.layerTypeToStringMapping).map((layerType, index) => {
                    return (
                        <MenuItem
                            key={index}
                            className="text-sm p-0.5"
                            onClick={() => props.onAddLayer(layerType as TLayerType)}
                        >
                            {props.layerTypeToStringMapping[layerType as TLayerType]}
                        </MenuItem>
                    );
                })}
                <MenuDivider />
                <MenuHeading>Shared settings</MenuHeading>
                {Object.keys(props.settingTypeToStringMapping).map((settingType, index) => {
                    return (
                        <MenuItem
                            key={index}
                            className="text-sm p-0.5"
                            onClick={() => props.onAddSharedSetting(settingType as TSettingType)}
                        >
                            {props.settingTypeToStringMapping[settingType as TSettingType]}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Dropdown>
    );
}
