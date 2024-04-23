import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api, WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Intersection, IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Radio, RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { isEqual } from "lodash";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
    userSelectedSeismicDataTypeAtom,
    userSelectedSeismicSurveyTypeAtom,
    userSelectedWellboreUuidAtom,
} from "./atoms/baseAtoms";
import {
    availableRealizationsAtom,
    availableUserCreatedIntersectionPolylinesAtom,
    gridModelDimensionsAtom,
    selectedGridModelNameAtom,
    selectedGridModelParameterDateOrIntervalAtom,
    selectedGridModelParameterNameAtom,
    selectedRealizationAtom,
} from "./atoms/derivedAtoms";
import { drilledWellboreHeadersQueryAtom, gridModelInfosQueryAtom } from "./atoms/queryAtoms";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import {
    addCustomIntersectionPolylineEditModeActiveAtom,
    currentCustomIntersectionPolylineAtom,
    editCustomIntersectionPolylineEditModeActiveAtom,
    intersectionTypeAtom,
    selectedCustomIntersectionPolylineIdAtom,
    selectedEnsembleIdentAtom,
    selectedWellboreUuidAtom,
} from "../sharedAtoms/sharedAtoms";
import { State } from "../state";
import {
    SeismicDataType,
    SeismicDataTypeToStringMapping,
    SeismicSurveyType,
    SeismicSurveyTypeToStringMapping,
} from "../typesAndEnums";
import { selectedCustomIntersectionPolylineAtom } from "../view/atoms/derivedAtoms";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): JSX.Element {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [showGridLines, setShowGridLines] = props.settingsContext.useSettingsToViewInterfaceState("showGridlines");
    const [zFactor, setZFactor] = props.settingsContext.useSettingsToViewInterfaceState("zFactor");
    const [intersectionExtensionLength, setIntersectionExtensionLength] =
        props.settingsContext.useSettingsToViewInterfaceState("intersectionExtensionLength");
    const [epsilon, setEpsilon] = props.settingsContext.useSettingsToViewInterfaceState("curveFittingEpsilon");

    const [prevSyncedIntersection, setPrevSyncedIntersection] = React.useState<Intersection | null>(null);

    const syncedSettingKeys = props.settingsContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedIntersection = syncHelper.useValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection");

    const [polylineAddModeActive, setPolylineAddModeActive] = useAtom(addCustomIntersectionPolylineEditModeActiveAtom);

    const [intersectionType, setIntersectionType] = useAtom(intersectionTypeAtom);

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

    const [selectedSeismicDataType, setSelectedSeismicDataType] = useAtom(userSelectedSeismicDataTypeAtom);
    const [selectedSeismicSurveyType, setSelectedSeismicSurveyType] = useAtom(userSelectedSeismicSurveyTypeAtom);

    const availableUserCreatedIntersectionPolylines = useAtomValue(availableUserCreatedIntersectionPolylinesAtom);
    const selectedCustomIntersectionPolylineId = useAtomValue(selectedCustomIntersectionPolylineIdAtom);
    const setSelectedCustomIntersectionPolylineId = useSetAtom(userSelectedCustomIntersectionPolylineIdAtom);

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
        const uuid = wellHeader.at(0);
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

    function handleEpsilonChange(event: React.ChangeEvent<HTMLInputElement>) {
        setEpsilon(parseFloat(event.target.value));
    }

    function handleIntersectionTypeChange(type: IntersectionType) {
        setIntersectionType(type);
        const uuid = type === IntersectionType.WELLBORE ? selectedWellboreHeader : selectedCustomIntersectionPolylineId;
        const intersection: Intersection = {
            type: type,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleCustomPolylineSelectionChange(customPolylineId: string[]) {
        setSelectedCustomIntersectionPolylineId(customPolylineId.at(0) ?? null);
        const uuid = customPolylineId.at(0) ?? null;
        const intersection: Intersection = {
            type: IntersectionType.CUSTOM_POLYLINE,
            uuid: uuid ?? "",
        };
        syncHelper.publishValue(SyncSettingKey.INTERSECTION, "global.syncValue.intersection", intersection);
    }

    function handleSeismicDataTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedSeismicDataType(event.target.value as SeismicDataType);
    }

    function handleSeismicSurveyTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        setSelectedSeismicSurveyType(event.target.value as SeismicSurveyType);
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
                        <Select
                            options={makeCustomIntersectionPolylineOptions(availableUserCreatedIntersectionPolylines)}
                            value={selectedCustomIntersectionPolylineId ? [selectedCustomIntersectionPolylineId] : []}
                            onChange={handleCustomPolylineSelectionChange}
                            size={5}
                            disabled={intersectionType !== IntersectionType.CUSTOM_POLYLINE || polylineAddModeActive}
                            placeholder="No custom polylines"
                        />
                    </div>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Seismic" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Seismic data type">
                        <RadioGroup
                            options={[
                                {
                                    label: SeismicDataTypeToStringMapping[SeismicDataType.SIMULATED],
                                    value: SeismicDataType.SIMULATED,
                                },
                                {
                                    label: SeismicDataTypeToStringMapping[SeismicDataType.OBSERVED],
                                    value: SeismicDataType.OBSERVED,
                                },
                            ]}
                            value={selectedSeismicDataType}
                            onChange={handleSeismicDataTypeChange}
                            direction="horizontal"
                        />
                    </Label>
                    <Label text="Seismic survey type">
                        <RadioGroup
                            options={[
                                {
                                    label: SeismicSurveyTypeToStringMapping[SeismicSurveyType.THREE_D],
                                    value: SeismicSurveyType.THREE_D,
                                },
                                {
                                    label: SeismicSurveyTypeToStringMapping[SeismicSurveyType.FOUR_D],
                                    value: SeismicSurveyType.FOUR_D,
                                },
                            ]}
                            value={selectedSeismicSurveyType}
                            onChange={handleSeismicSurveyTypeChange}
                            direction="horizontal"
                        />
                    </Label>
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
                <Label text="Epsilon">
                    <Input type="number" value={epsilon} min={0} onChange={handleEpsilonChange} />
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

function makeCustomIntersectionPolylineOptions(polylines: IntersectionPolyline[]): SelectOption[] {
    return polylines.map((polyline) => ({
        label: polyline.name,
        value: polyline.id,
    }));
}
