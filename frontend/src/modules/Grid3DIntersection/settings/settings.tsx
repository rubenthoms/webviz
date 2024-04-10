import { Grid3dInfo_api, Grid3dPropertyInfo_api, WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtomValue, useSetAtom } from "jotai";

import {
    userSelectedEnsembleIdentAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
    userSelectedWellboreUuidAtom,
} from "./atoms/baseAtoms";
import {
    availableRealizationsAtom,
    selectedEnsembleIdentAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
    selectedWellboreHeaderAtom,
} from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom, gridModelInfosQueryAtom } from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): JSX.Element {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const selectedEnsembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const setSelectedEnsembleIdent = useSetAtom(userSelectedEnsembleIdentAtom);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const selectedRealization = useAtomValue(selectedRealizationAtom);
    const setSelectedRealization = useSetAtom(userSelectedRealizationAtom);

    const gridModelInfos = useAtomValue(gridModelInfosQueryAtom);
    const wellHeaders = useAtomValue(drilledWellboreHeadersQueryAtom);

    const selectedGridModelName = useAtomValue(selectedGridModelNameAtom);
    const setSelectedGridModelName = useSetAtom(userSelectedGridModelNameAtom);

    const selectedGridModelParameterName = useAtomValue(selectedGridModelParameterNameAtom);
    const setSelectedGridModelParameterName = useSetAtom(userSelectedGridModelParameterNameAtom);

    const selectedGridModelParameterDateOrInterval = useAtomValue(selectedGridModelParameterDateOrIntervalAtom);
    const setSelectedGridModelParameterDateOrInterval = useSetAtom(userSelectedGridModelParameterDateOrIntervalAtom);

    const selectedWellboreHeader = useAtomValue(selectedWellboreHeaderAtom);
    const setSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);

    let gridModelErrorMessage = "";
    if (gridModelInfos.isError) {
        statusWriter.addError("Failed to load grid model infos");
        gridModelErrorMessage = "Failed to load grid model infos";
    }

    let wellHeadersErrorMessage = "";
    if (wellHeaders.isError) {
        statusWriter.addError("Failed to load well headers");
        wellHeadersErrorMessage = "Failed to load well headers";
    }

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleRealizationSelectionChange(realization: string) {
        setSelectedRealization(parseInt(realization));
    }

    function handleGridModelSelectionChange(gridModelName: string[]) {
        setSelectedGridModelName(gridModelName.at(0) ?? null);
    }

    function handleGridParameterSelectionChange(gridParameterName: string[]) {
        setSelectedGridModelParameterName(gridParameterName.at(0) ?? null);
    }

    function handleGridParameterDateOrIntervalSelectionChange(dateOrInterval: string[]) {
        setSelectedGridModelParameterDateOrInterval(dateOrInterval.at(0) ?? null);
    }

    function handleWellHeaderSelectionChange(wellHeader: string[]) {
        setSelectedWellboreHeader(wellHeader.at(0) ?? null);
    }

    const realizationOptions = makeRealizationOptions(availableRealizations);
    const gridModelInfo = gridModelInfos.data?.find((info) => info.grid_name === selectedGridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr.filter((el) => el.property_name === selectedGridModelParameterName) ?? [];

    return (
        <>
            <CollapsibleGroup title="Ensemble & realization" expanded>
                <Label text="Ensemble">
                    <EnsembleDropdown
                        ensembleSet={ensembleSet}
                        value={selectedEnsembleIdent}
                        onChange={handleEnsembleSelectionChange}
                    />
                </Label>
                <Label text="Realization">
                    <Dropdown
                        options={realizationOptions}
                        value={selectedRealization?.toString()}
                        onChange={handleRealizationSelectionChange}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup title="Grid model" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Grid model">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridModelOptions(gridModelInfos.data ?? [])}
                                value={selectedGridModelName ? [selectedGridModelName] : []}
                                onChange={handleGridModelSelectionChange}
                                size={5}
                            />
                        </PendingWrapper>
                    </Label>
                    <Label text="Grid parameter">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridParameterNameOptions(gridModelInfo)}
                                value={selectedGridModelParameterName ? [selectedGridModelParameterName] : []}
                                onChange={handleGridParameterSelectionChange}
                                size={5}
                            />
                        </PendingWrapper>
                    </Label>
                    <Label text="Grid date or interval">
                        <PendingWrapper isPending={gridModelInfos.isFetching} errorMessage={gridModelErrorMessage}>
                            <Select
                                options={makeGridParameterDateOrIntervalOptions(datesOrIntervalsForSelectedParameter)}
                                value={
                                    selectedGridModelParameterDateOrInterval
                                        ? [selectedGridModelParameterDateOrInterval]
                                        : []
                                }
                                onChange={handleGridParameterDateOrIntervalSelectionChange}
                                size={5}
                            />
                        </PendingWrapper>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Wellbore header" expanded>
                <PendingWrapper isPending={wellHeaders.isFetching} errorMessage={wellHeadersErrorMessage}>
                    <Select
                        options={makeWellHeaderOptions(wellHeaders.data ?? [])}
                        value={selectedWellboreHeader ? [selectedWellboreHeader] : []}
                        onChange={handleWellHeaderSelectionChange}
                        size={5}
                        filter
                    />
                </PendingWrapper>
            </CollapsibleGroup>
        </>
    );
}

function makeRealizationOptions(realizations: readonly number[]): SelectOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeGridModelOptions(gridModelsInfo: Grid3dInfo_api[]): SelectOption[] {
    return gridModelsInfo.map((gridModel) => ({ label: gridModel.grid_name, value: gridModel.grid_name }));
}

function makeGridParameterNameOptions(gridModelInfo: Grid3dInfo_api | null): SelectOption[] {
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

function makeGridParameterDateOrIntervalOptions(datesOrIntervals: Grid3dPropertyInfo_api[]): SelectOption[] {
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

function makeWellHeaderOptions(wellHeaders: WellboreHeader_api[]): SelectOption[] {
    return wellHeaders.map((wellHeader) => ({
        value: wellHeader.wellbore_uuid,
        label: wellHeader.unique_wellbore_identifier,
    }));
}
