import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { ColorScale } from "@lib/utils/ColorScale";
import { LayerBoundingBox } from "@modules/Intersection/typesAndEnums";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";

import { useAtomValue } from "jotai";

import { gridModelInfosQueryAtom } from "../../atoms/queryAtoms";

export type GridLayerSettingsComponentProps = {
    layer: GridLayer;
    updateSetting: <T extends keyof GridLayerSettings>(setting: T, value: GridLayerSettings[T]) => void;
};

export const GridLayerSettingsComponent: React.FC<GridLayerSettingsComponentProps> = (props) => {
    const gridModelInfos = useAtomValue(gridModelInfosQueryAtom);

    let gridModelErrorMessage = "";
    if (gridModelInfos.isError) {
        gridModelErrorMessage = "Failed to load grid model infos";
    }

    function handleGridModelSelectionChange(selected: string) {
        props.updateSetting("modelName", selected);
    }

    function handleGridParameterSelectionChange(selected: string) {
        props.updateSetting("parameterName", selected);
    }

    function handleGridParameterDateOrIntervalSelectionChange(selected: string) {
        props.updateSetting("parameterDateOrInterval", selected);
    }

    const gridModelInfo =
        gridModelInfos.data?.find((info) => info.grid_name === props.layer.settings.modelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr.filter((el) => el.property_name === props.layer.settings.parameterName) ?? [];

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3">
            <div className="table-row">
                <div className="table-cell">Model</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridModelOptions(gridModelInfos.data ?? [])}
                        value={props.layer.settings.modelName ?? undefined}
                        onChange={handleGridModelSelectionChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Parameter</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridParameterNameOptions(gridModelInfo)}
                        value={props.layer.settings.parameterName ?? undefined}
                        onChange={handleGridParameterSelectionChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Date or interval</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridParameterDateOrIntervalOptions(datesOrIntervalsForSelectedParameter)}
                        value={props.layer.settings.parameterDateOrInterval ?? undefined}
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
