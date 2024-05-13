import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { ColorScale } from "@lib/utils/ColorScale";
import { LayerBoundingBox } from "@modules/Intersection/typesAndEnums";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";

import { useAtomValue } from "jotai";

import { gridModelInfosQueryAtom } from "../../atoms/queryAtoms";

export type GridLayerSettingsComponentProps = {
    layer: GridLayer;
    ensembleSet: EnsembleSet;
    updateSetting: <T extends keyof GridLayerSettings>(setting: T, value: GridLayerSettings[T]) => void;
};

export const GridLayerSettingsComponent: React.FC<GridLayerSettingsComponentProps> = (props) => {
    const gridModelInfos = useAtomValue(gridModelInfosQueryAtom);
    const settings = useLayerSettings(props.layer);

    let gridModelErrorMessage = "";
    if (gridModelInfos.isError) {
        gridModelErrorMessage = "Failed to load grid model infos";
    }

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        props.updateSetting("ensembleIdent", ensembleIdent);
    }

    function handleGridModelSelectionChange(selected: string) {
        props.updateSetting("gridModelName", selected);
    }

    function handleGridParameterSelectionChange(selected: string) {
        props.updateSetting("parameterName", selected);
    }

    function handleGridParameterDateOrIntervalSelectionChange(selected: string) {
        props.updateSetting("parameterDateOrInterval", selected);
    }

    const gridModelInfo = gridModelInfos.data?.find((info) => info.grid_name === settings.gridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr.filter((el) => el.property_name === settings.parameterName) ?? [];

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3">
            <div className="table-row">
                <div className="table-cell">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Model</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridModelOptions(gridModelInfos.data ?? [])}
                        value={settings.gridModelName ?? undefined}
                        onChange={handleGridModelSelectionChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Parameter</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridParameterNameOptions(gridModelInfo)}
                        value={settings.parameterName ?? undefined}
                        onChange={handleGridParameterSelectionChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Date or interval</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridParameterDateOrIntervalOptions(datesOrIntervalsForSelectedParameter)}
                        value={settings.parameterDateOrInterval ?? undefined}
                        onChange={handleGridParameterDateOrIntervalSelectionChange}
                    />
                </div>
            </div>
        </div>
    );
};

function makeGridModelOptions(gridModelsInfo: Grid3dInfo_api[]): DropdownOption[] {
    return gridModelsInfo.map((gridModel) => ({ label: gridModel.grid_name, value: gridModel.grid_name }));
}

function makeGridParameterNameOptions(gridModelInfo: Grid3dInfo_api | null): DropdownOption[] {
    if (!gridModelInfo) {
        return [];
    }
    const reduced = gridModelInfo.property_info_arr.reduce((acc, info) => {
        if (!acc.includes(info.property_name)) {
            acc.push(info.property_name);
        }
        return acc;
    }, [] as string[]);

    return reduced.map((info) => ({
        label: info,
        value: info,
    }));
}

function makeGridParameterDateOrIntervalOptions(datesOrIntervals: Grid3dPropertyInfo_api[]): DropdownOption[] {
    const reduced = datesOrIntervals.reduce((acc, info) => {
        if (info.iso_date_or_interval === null) {
            return acc;
        } else if (!acc.includes(info.iso_date_or_interval)) {
            acc.push(info.iso_date_or_interval);
        }
        return acc;
    }, [] as string[]);

    return reduced.map((info) => ({
        label: info,
        value: info,
    }));
}
