import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { ColorScale } from "@lib/utils/ColorScale";
import { LayerBoundingBox } from "@modules/Intersection/typesAndEnums";
import { BoundingBox, useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type GridLayerSettingsComponentProps = {
    layer: GridLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
};

export const GridLayerSettingsComponent: React.FC<GridLayerSettingsComponentProps> = (props) => {
    const settings = useLayerSettings(props.layer);

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const gridModelInfosQuery = useGridModelInfosQuery(settings.ensembleIdent, settings.realizationNum);

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        settings
    );
    if (!isEqual(fixupEnsembleIdent, settings.ensembleIdent)) {
        props.layer.maybeUpdateSettings({ ensembleIdent: fixupEnsembleIdent });
    }

    if (settings.ensembleIdent) {
        const fixupRealizationNum = fixupSetting(
            "realizationNum",
            ensembleFilterFunc(settings.ensembleIdent),
            settings
        );
        if (!isEqual(fixupRealizationNum, settings.realizationNum)) {
            props.layer.maybeUpdateSettings({ realizationNum: fixupRealizationNum });
        }
    }

    if (gridModelInfosQuery.data) {
        const fixupGridModelName = fixupSetting(
            "gridModelName",
            gridModelInfosQuery.data.map((el) => el.grid_name),
            settings
        );
        if (!isEqual(fixupGridModelName, settings.gridModelName)) {
            props.layer.maybeUpdateSettings({ gridModelName: fixupGridModelName });
            if (fixupGridModelName) {
                updateBoundingBox(fixupGridModelName);
            }
        }

        const gridModelInfo = gridModelInfosQuery.data.find((info) => info.grid_name === settings.gridModelName);
        if (gridModelInfo) {
            const fixupParameterName = fixupSetting(
                "parameterName",
                gridModelInfo.property_info_arr.map((el) => el.property_name),
                settings
            );
            if (!isEqual(fixupParameterName, settings.parameterName)) {
                props.layer.maybeUpdateSettings({ parameterName: fixupParameterName });
            }

            const datesOrIntervalsForSelectedParameter = gridModelInfo.property_info_arr.filter(
                (el) => el.property_name === settings.parameterName
            );
            const fixupParameterDateOrInterval = fixupSetting(
                "parameterDateOrInterval",
                datesOrIntervalsForSelectedParameter.map((el) => el.iso_date_or_interval),
                settings
            );
            if (!isEqual(fixupParameterDateOrInterval, settings.parameterDateOrInterval)) {
                props.layer.maybeUpdateSettings({ parameterDateOrInterval: fixupParameterDateOrInterval });
            }
        }
    }

    function updateBoundingBox(gridModelName: string) {
        const gridModelInfo = gridModelInfosQuery.data?.find((info) => info.grid_name === gridModelName) ?? null;
        if (gridModelInfo) {
            const boundingBox: BoundingBox = {
                x: [gridModelInfo.bbox.xmin, gridModelInfo.bbox.xmax],
                y: [gridModelInfo.bbox.ymin, gridModelInfo.bbox.ymax],
                z: [gridModelInfo.bbox.zmin, gridModelInfo.bbox.zmax],
            };
            props.layer.setBoundingBox(boundingBox);
        }
    }

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        props.layer.maybeUpdateSettings({ ensembleIdent });
    }

    function handleRealizationChange(realizationNum: string) {
        props.layer.maybeUpdateSettings({ realizationNum: parseInt(realizationNum) });
    }

    function handleGridModelSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ gridModelName: selected });
        updateBoundingBox(selected);
    }

    function handleGridParameterSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ parameterName: selected });
    }

    function handleGridParameterDateOrIntervalSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ parameterDateOrInterval: selected });
    }

    const gridModelInfo = gridModelInfosQuery.data?.find((info) => info.grid_name === settings.gridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr.filter((el) => el.property_name === settings.parameterName) ?? [];

    const availableRealizations: number[] = [];
    if (settings.ensembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(settings.ensembleIdent));
    }

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
                <div className="table-cell">Realization</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeRealizationOptions(availableRealizations)}
                        value={settings.realizationNum?.toString() ?? undefined}
                        onChange={handleRealizationChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Model</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeGridModelOptions(gridModelInfosQuery.data ?? [])}
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

function makeRealizationOptions(realizations: readonly number[]): DropdownOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

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

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

function useGridModelInfosQuery(ensembleIdent: EnsembleIdent | null, realizationNum: number | null) {
    return useQuery({
        queryKey: ["getGridModelInfos", ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName(), realizationNum],
        queryFn: () =>
            apiService.grid3D.getGridModelsInfo(
                ensembleIdent?.getCaseUuid() ?? "",
                ensembleIdent?.getEnsembleName() ?? "",
                realizationNum ?? 0
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(ensembleIdent && realizationNum !== null),
    });
}

function fixupSetting<TSettings extends GridLayerSettings, TKey extends keyof GridLayerSettings>(
    setting: TKey,
    validOptions: readonly TSettings[TKey][],
    settings: TSettings
): TSettings[TKey] {
    if (validOptions.length === 0) {
        return settings[setting];
    }

    if (!validOptions.includes(settings[setting]) || settings[setting] === null) {
        return validOptions[0];
    }

    return settings[setting];
}
