import React from "react";

import { Grid3dInfo_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Switch } from "@lib/components/Switch";
import { ColorScale } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { GridLayer, GridLayerSettings } from "@modules/Intersection/utils/layers/GridLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { isoIntervalStringToDateLabel, isoStringToDateLabel } from "@modules/_shared/utils/isoDatetimeStringFormatting";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type GridLayerSettingsComponentProps = {
    layer: GridLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
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

    const gridModelInfo = gridModelInfosQuery.data?.find((info) => info.grid_name === settings.gridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr
            .filter((el) => el.property_name === settings.parameterName)
            .map((el) => el.iso_date_or_interval)
            .sort() ?? [];

    if (gridModelInfosQuery.data) {
        const fixupGridModelName = fixupSetting(
            "gridModelName",
            gridModelInfosQuery.data.map((el) => el.grid_name),
            settings
        );
        if (!isEqual(fixupGridModelName, settings.gridModelName)) {
            props.layer.maybeUpdateSettings({ gridModelName: fixupGridModelName });
        }

        if (gridModelInfo) {
            const fixupParameterName = fixupSetting(
                "parameterName",
                gridModelInfo.property_info_arr.map((el) => el.property_name),
                settings
            );
            if (!isEqual(fixupParameterName, settings.parameterName)) {
                props.layer.maybeUpdateSettings({ parameterName: fixupParameterName });
            }

            const fixupParameterDateOrInterval = fixupSetting(
                "parameterDateOrInterval",
                datesOrIntervalsForSelectedParameter,
                settings
            );
            if (!isEqual(fixupParameterDateOrInterval, settings.parameterDateOrInterval)) {
                props.layer.maybeUpdateSettings({ parameterDateOrInterval: fixupParameterDateOrInterval });
            }
        }

        props.layer.maybeRefetchData();
    }

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        props.layer.maybeUpdateSettings({ ensembleIdent });
    }

    function handleRealizationChange(realizationNum: string) {
        props.layer.maybeUpdateSettings({ realizationNum: parseInt(realizationNum) });
    }

    function handleGridModelSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ gridModelName: selected });
    }

    function handleGridParameterSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ parameterName: selected });
    }

    function handleGridParameterDateOrIntervalSelectionChange(selected: string) {
        props.layer.maybeUpdateSettings({ parameterDateOrInterval: selected });
    }

    function handleShowMeshChange(e: React.ChangeEvent<HTMLInputElement>) {
        const showMesh = e.target.checked;
        props.layer.maybeUpdateSettings({ showMesh });
    }

    function handleColorScaleChange(newColorScale: ColorScale, areBoundariesUserDefined: boolean) {
        props.layer.setColorScale(newColorScale);
        props.layer.setUseCustomColorScaleBoundaries(areBoundariesUserDefined);
    }

    const availableRealizations: number[] = [];
    if (settings.ensembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(settings.ensembleIdent));
    }

    const gridModelParameterDateOrIntervalOptions = makeGridParameterDateOrIntervalOptions(
        datesOrIntervalsForSelectedParameter
    );

    let gridModelInfosQueryErrorMessage = "";
    if (gridModelInfosQuery.isError) {
        gridModelInfosQueryErrorMessage = gridModelInfosQuery.error.message;
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell align-middle w-24">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Realization</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeRealizationOptions(availableRealizations)}
                        value={settings.realizationNum?.toString() ?? undefined}
                        onChange={handleRealizationChange}
                        showArrows
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Model</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={makeGridModelOptions(gridModelInfosQuery.data ?? [])}
                            value={settings.gridModelName ?? undefined}
                            onChange={handleGridModelSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Parameter</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={makeGridParameterNameOptions(gridModelInfo)}
                            value={settings.parameterName ?? undefined}
                            onChange={handleGridParameterSelectionChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div
                    className={resolveClassNames("table-cell align-middle", {
                        "text-gray-300": gridModelParameterDateOrIntervalOptions.length === 0,
                    })}
                >
                    Date or interval
                </div>
                <div className="table-cell align-top">
                    <PendingWrapper
                        isPending={gridModelInfosQuery.isFetching}
                        errorMessage={gridModelInfosQueryErrorMessage}
                    >
                        <Dropdown
                            options={gridModelParameterDateOrIntervalOptions}
                            value={settings.parameterDateOrInterval ?? undefined}
                            onChange={handleGridParameterDateOrIntervalSelectionChange}
                            showArrows
                            disabled={gridModelParameterDateOrIntervalOptions.length === 0}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Show mesh</div>
                <div className="table-cell align-top">
                    <Switch checked={settings.showMesh} onChange={handleShowMeshChange} />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell max-w-0 align-top">Color scale</div>
                <div className="table-cell">
                    <ColorScaleSelector
                        colorScale={props.layer.getColorScale()}
                        areBoundariesUserDefined={props.layer.getUseCustomColorScaleBoundaries()}
                        workbenchSettings={props.workbenchSettings}
                        onChange={handleColorScaleChange}
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

function makeGridParameterDateOrIntervalOptions(datesOrIntervals: (string | null)[]): DropdownOption[] {
    const reduced = datesOrIntervals.reduce((acc, info) => {
        if (info === null) {
            return acc;
        } else if (!acc.map((el) => el.value).includes(info)) {
            acc.push({
                value: info,
                label: info.includes("/") ? isoIntervalStringToDateLabel(info) : isoStringToDateLabel(info),
            });
        }
        return acc;
    }, [] as { label: string; value: string }[]);

    return reduced;
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
