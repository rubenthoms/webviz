import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleSettingsProps } from "@framework/Module";
import { WorkbenchSession, useEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Menu } from "@lib/components/Menu";
import { MenuDivider } from "@lib/components/MenuDivider";
import { MenuHeading } from "@lib/components/MenuHeading";
import { MenuItem } from "@lib/components/MenuItem";
import { LayersPanel } from "@modules/_shared/components/Layers";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";
import { LayerSettingFactory } from "@modules/_shared/layers/settings/LayerSettingFactory";
import { SETTING_TYPE_TO_STRING_MAPPING, SettingType } from "@modules/_shared/layers/settings/SettingTypes";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown, GridView } from "@mui/icons-material";

import { useAtomValue, useSetAtom } from "jotai";

import { userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { filteredEnsembleSetAtom, layerManagerAtom, selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { FaultPolygonLayerSettingsComponent } from "./components/layerSettings/faultPolygonLayer";
import { PolygonLayerSettingsComponent } from "./components/layerSettings/polygonLayer";
import { SurfaceLayerSettingsComponent } from "./components/layerSettings/surfaceLayer";
import { WellboreLayerSettingsComponent } from "./components/layerSettings/wellboreLayer";

import { isFaultPolygonLayer } from "../layers/FaultPolygonLayer";
import { LayerFactory } from "../layers/LayerFactory";
import { isPolygonLayer } from "../layers/PolygonLayer";
import { isSurfaceLayer } from "../layers/SurfaceLayer";
import { isWellboreLayer } from "../layers/WellboreLayer";
import { LAYER_TYPE_TO_STRING_MAPPING, LayerType } from "../layers/types";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedFieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);

    const filteredEnsembleSet = useAtomValue(filteredEnsembleSetAtom);

    const layerManager = useAtomValue(layerManagerAtom);

    function handleFieldIdentifierChange(fieldIdentifier: string | null) {
        setSelectedFieldIdentifier(fieldIdentifier);
    }

    function handleAddLayer(layerType: LayerType) {
        const layer = LayerFactory.makeLayer(layerType, layerManager);
        layerManager.addLayer(layer);
    }

    function handleAddView() {
        layerManager.addGroup("View");
    }

    function handleAddSetting(settingType: SettingType) {
        const setting = LayerSettingFactory.makeSetting(settingType);
        layerManager.addSetting(setting);
    }

    return (
        <div className="flex flex-col gap-2 h-full">
            <CollapsibleGroup title="Field" expanded>
                <FieldDropdown
                    ensembleSet={ensembleSet}
                    value={selectedFieldIdentifier}
                    onChange={handleFieldIdentifierChange}
                />
            </CollapsibleGroup>
            <div className="flex-grow flex flex-col min-h-0">
                <LayersPanel
                    title="Layers"
                    ensembleSet={filteredEnsembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layerManager={layerManager}
                    layerFactory={LayerFactory}
                    layerTypeToStringMapping={LAYER_TYPE_TO_STRING_MAPPING}
                    makeSettingsContainerFunc={makeSettingsContainer}
                    actions={
                        <LayersPanelActions
                            layerTypeToStringMapping={LAYER_TYPE_TO_STRING_MAPPING}
                            settingTypeToStringMapping={SETTING_TYPE_TO_STRING_MAPPING}
                            onAddView={handleAddView}
                            onAddLayer={handleAddLayer}
                            onAddSetting={handleAddSetting}
                        />
                    }
                    groupIcon={<GridView fontSize="inherit" />}
                />
            </div>
        </div>
    );
}

type LayersPanelActionsProps<TLayerType extends string, TSettingType extends string> = {
    layerTypeToStringMapping: Record<TLayerType, string>;
    settingTypeToStringMapping: Record<TSettingType, string>;
    onAddView: () => void;
    onAddLayer: (layerType: TLayerType) => void;
    onAddSetting: (settingType: TSettingType) => void;
};

function LayersPanelActions<TLayerType extends string, TSettingType extends string>(
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
                <MenuHeading>Settings</MenuHeading>
                {Object.keys(props.settingTypeToStringMapping).map((settingType, index) => {
                    return (
                        <MenuItem
                            key={index}
                            className="text-sm p-0.5"
                            onClick={() => props.onAddSetting(settingType as TSettingType)}
                        >
                            {props.settingTypeToStringMapping[settingType as TSettingType]}
                        </MenuItem>
                    );
                })}
            </Menu>
        </Dropdown>
    );
}

function makeSettingsContainer(
    layer: BaseLayer<any, any>,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactNode {
    if (isSurfaceLayer(layer)) {
        return (
            <SurfaceLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    if (isWellboreLayer(layer)) {
        return (
            <WellboreLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    if (isFaultPolygonLayer(layer)) {
        return (
            <FaultPolygonLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    if (isPolygonLayer(layer)) {
        return (
            <PolygonLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    return null;
}
