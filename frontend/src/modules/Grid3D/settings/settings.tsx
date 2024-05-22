import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api, WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { Button } from "@lib/components/Button";
import { Checkbox } from "@lib/components/Checkbox";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Radio } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { Slider } from "@lib/components/Slider";
import { Switch } from "@lib/components/Switch";
import { TableSelect, TableSelectOption } from "@lib/components/TableSelect";
import { ColorScale } from "@lib/utils/ColorScale";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { Check, Delete, Edit } from "@mui/icons-material";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";
import { v4 } from "uuid";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGridCellIndexRangesAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
    userSelectedWellboreUuidAtom,
} from "./atoms/baseAtoms";
import {
    availableRealizationsAtom,
    gridModelDimensionsAtom,
    selectedGridCellIndexRangesAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
} from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom, gridModelInfosQueryAtom } from "./atoms/queryAtoms";
import { GridCellIndexFilter } from "./components/gridCellIndexFilter";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import {
    addCustomIntersectionPolylineEditModeActiveAtom,
    editCustomIntersectionPolylineEditModeActiveAtom,
    intersectionTypeAtom,
    selectedEnsembleIdentAtom,
    selectedWellboreUuidAtom,
} from "../sharedAtoms/sharedAtoms";
import { State } from "../state";
import { GridCellIndexRanges } from "../typesAndEnums";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): JSX.Element {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [showGridLines, setShowGridLines] = props.settingsContext.useSettingsToViewInterfaceState("showGridlines");
    const [zFactor, setZFactor] = props.settingsContext.useSettingsToViewInterfaceState("zFactor");
    const [intersectionExtensionLength, setIntersectionExtensionLength] =
        props.settingsContext.useSettingsToViewInterfaceState("intersectionExtensionLength");
    const setPolylineEditModeActive = useSetAtom(editCustomIntersectionPolylineEditModeActiveAtom);

    const [prevSyncedIntersection, setPrevSyncedIntersection] = React.useState<Intersection | null>(null);
    const [prevSyncedEnsembles, setPrevSyncedEnsembles] = React.useState<EnsembleIdent[] | null>(null);
    const [pickSingleGridCellIndexI, setPickSingleGridCellIndexI] = React.useState<boolean>(false);
    const [pickSingleGridCellIndexJ, setPickSingleGridCellIndexJ] = React.useState<boolean>(false);
    const [pickSingleGridCellIndexK, setPickSingleGridCellIndexK] = React.useState<boolean>(false);

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");
    const syncedIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");

    const polylineAddModeActive = useAtomValue(addCustomIntersectionPolylineEditModeActiveAtom);

    const [intersectionType, setIntersectionType] = useAtom(intersectionTypeAtom);

    const gridModelDimensions = useAtomValue(gridModelDimensionsAtom);

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

    const selectedWellboreHeader = useAtomValue(selectedWellboreUuidAtom);
    const setSelectedWellboreHeader = useSetAtom(userSelectedWellboreUuidAtom);

    const availableUserCreatedIntersectionPolylines = useIntersectionPolylines(props.workbenchSession).getPolylines();
    const selectedCustomIntersectionPolylineId = useAtomValue(userSelectedCustomIntersectionPolylineIdAtom);
    const setSelectedCustomIntersectionPolylineId = useSetAtom(userSelectedCustomIntersectionPolylineIdAtom);

    const selectedGridCellIndexRanges = useAtomValue(selectedGridCellIndexRangesAtom);
    const setSelectedGridCellIndexRanges = useSetAtom(userSelectedGridCellIndexRangesAtom);

    if (!isEqual(syncedIntersection, prevSyncedIntersection)) {
        setPrevSyncedIntersection(syncedIntersection);
        if (syncedIntersection) {
            setIntersectionType(syncedIntersection.type);

            if (syncedIntersection.type === IntersectionType.WELLBORE) {
                setSelectedWellboreHeader(syncedIntersection.uuid);
            } else if (syncedIntersection.type === IntersectionType.CUSTOM_POLYLINE) {
                setSelectedCustomIntersectionPolylineId(syncedIntersection.uuid);
            }
        }
    }

    if (!isEqual(syncedEnsembles, prevSyncedEnsembles)) {
        setPrevSyncedEnsembles(syncedEnsembles);
        if (syncedEnsembles) {
            setSelectedEnsembleIdent(syncedEnsembles[0]);
        }
    }

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
        syncHelper.publishValue(
            SyncSettingKey.ENSEMBLE,
            "global.syncValue.ensembles",
            ensembleIdent ? [ensembleIdent] : []
        );
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
        const uuid = wellHeader.at(0);
        setSelectedWellboreHeader(uuid ?? null);
        const intersection: Intersection = {
            type: IntersectionType.WELLBORE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleShowGridLinesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowGridLines(event.target.checked);
    }

    function handleZFactorChange(event: React.ChangeEvent<HTMLInputElement>) {
        setZFactor(parseFloat(event.target.value));
    }

    function handleIntersectionExtensionLengthChange(event: React.ChangeEvent<HTMLInputElement>) {
        setIntersectionExtensionLength(parseFloat(event.target.value));
    }

    function handleIntersectionTypeChange(type: IntersectionType) {
        setIntersectionType(type);
    }

    function handleEditPolyline() {
        setPolylineEditModeActive(true);
    }

    function handleCustomPolylineSelectionChange(customPolylineId: string[]) {
        setSelectedCustomIntersectionPolylineId(customPolylineId.at(0) ?? null);
        const uuid = customPolylineId.at(0) ?? null;
        setSelectedCustomIntersectionPolylineId(uuid);
        const intersection: Intersection = {
            type: IntersectionType.CUSTOM_POLYLINE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleRemoveCustomPolyline() {
        if (selectedCustomIntersectionPolylineId) {
            props.workbenchSession
                .getUserCreatedItems()
                .getIntersectionPolylines()
                .remove(selectedCustomIntersectionPolylineId);
        }
    }

    function handleGridCellIndexRangesChange(direction: "i" | "j" | "k", value: [number, number]) {
        const newGridCellIndexRanges: GridCellIndexRanges = {
            ...selectedGridCellIndexRanges,
            [direction]: value,
        };
        setSelectedGridCellIndexRanges(newGridCellIndexRanges);
    }

    const realizationOptions = makeRealizationOptions(availableRealizations);
    const gridModelInfo = gridModelInfos.data?.find((info) => info.grid_name === selectedGridModelName) ?? null;
    const datesOrIntervalsForSelectedParameter =
        gridModelInfo?.property_info_arr.filter((el) => el.property_name === selectedGridModelParameterName) ?? [];

    return (
        <div className="flex flex-col gap-1">
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
                                debounceTimeMs={600}
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
                                debounceTimeMs={600}
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
                                debounceTimeMs={600}
                            />
                        </PendingWrapper>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Grid cell filter" expanded>
                <div className="flex flex-col gap-4">
                    <GridCellIndexFilter
                        labelTitle="I filter"
                        max={gridModelDimensions?.i_count ?? 0}
                        range={selectedGridCellIndexRanges.i}
                        pickSingle={pickSingleGridCellIndexI}
                        onPickSingleChange={setPickSingleGridCellIndexI}
                        onChange={(range) => handleGridCellIndexRangesChange("i", range)}
                    />
                    <GridCellIndexFilter
                        labelTitle="J filter"
                        max={gridModelDimensions?.j_count ?? 0}
                        range={selectedGridCellIndexRanges.j}
                        pickSingle={pickSingleGridCellIndexJ}
                        onPickSingleChange={setPickSingleGridCellIndexJ}
                        onChange={(range) => handleGridCellIndexRangesChange("j", range)}
                    />
                    <GridCellIndexFilter
                        labelTitle="K filter"
                        max={gridModelDimensions?.k_count ?? 0}
                        range={selectedGridCellIndexRanges.k}
                        pickSingle={pickSingleGridCellIndexK}
                        onPickSingleChange={setPickSingleGridCellIndexK}
                        onChange={(range) => handleGridCellIndexRangesChange("k", range)}
                    />
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Intersection" expanded>
                <div className="flex flex-col gap-4 text-sm mb-4">
                    <Radio
                        name="intersectionType"
                        value={intersectionType}
                        checked={intersectionType === IntersectionType.WELLBORE}
                        onChange={() => handleIntersectionTypeChange(IntersectionType.WELLBORE)}
                        label={<strong>Use wellbore</strong>}
                    />
                    <PendingWrapper isPending={wellHeaders.isFetching} errorMessage={wellHeadersErrorMessage}>
                        <Select
                            options={makeWellHeaderOptions(wellHeaders.data ?? [])}
                            value={selectedWellboreHeader ? [selectedWellboreHeader] : []}
                            onChange={handleWellHeaderSelectionChange}
                            size={5}
                            filter
                            debounceTimeMs={600}
                            disabled={intersectionType !== IntersectionType.WELLBORE}
                        />
                    </PendingWrapper>
                    <div className="flex flex-col gap-2">
                        <Radio
                            name="intersectionType"
                            value={intersectionType}
                            checked={intersectionType === IntersectionType.CUSTOM_POLYLINE}
                            onChange={() => handleIntersectionTypeChange(IntersectionType.CUSTOM_POLYLINE)}
                            label={<strong>Use custom polyline</strong>}
                        />
                        <TableSelect
                            options={makeCustomIntersectionPolylineOptions(
                                availableUserCreatedIntersectionPolylines,
                                selectedCustomIntersectionPolylineId,
                                <div className="flex items-center">
                                    <div
                                        onClick={handleEditPolyline}
                                        className="p-1 hover:underline cursor-pointer hover:text-blue-200"
                                        title="Edit polyline"
                                    >
                                        <Edit fontSize="small" />
                                    </div>
                                    <div
                                        onClick={handleRemoveCustomPolyline}
                                        className="p-1 hover:underline cursor-pointer hover:text-red-400"
                                        title="Remove polyline"
                                    >
                                        <Delete fontSize="small" />
                                    </div>
                                </div>
                            )}
                            value={selectedCustomIntersectionPolylineId ? [selectedCustomIntersectionPolylineId] : []}
                            headerLabels={["Polyline name", "Actions"]}
                            onChange={handleCustomPolylineSelectionChange}
                            size={5}
                            columnSizesInPercent={[80, 20]}
                            disabled={intersectionType !== IntersectionType.CUSTOM_POLYLINE || polylineAddModeActive}
                        />
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Visualization options" expanded>
                <Label text="Show grid lines" position="left">
                    <Switch checked={showGridLines} onChange={handleShowGridLinesChange} />
                </Label>
                <Label text="Z factor">
                    <Input type="number" value={zFactor} min={0} onChange={handleZFactorChange} />
                </Label>
                <Label text="Intersection extension length">
                    <Input
                        type="number"
                        value={intersectionExtensionLength}
                        min={0}
                        onChange={handleIntersectionExtensionLengthChange}
                    />
                </Label>
            </CollapsibleGroup>
        </div>
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

function makeCustomIntersectionPolylineOptions(
    polylines: IntersectionPolyline[],
    selectedId: string | null,
    actions: React.ReactNode
): TableSelectOption[] {
    return polylines.map((polyline) => ({
        id: polyline.id,
        values: [{ label: polyline.name }, { label: "", adornment: selectedId === polyline.id ? actions : undefined }],
    }));
}
