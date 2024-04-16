import React from "react";

import { Grid3dInfo_api, Grid3dPropertyInfo_api, WellboreHeader_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UserCreatedItemsAtom } from "@framework/GlobalAtoms";
import { ModuleSettingsProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { IntersectionPolyline } from "@framework/userCreatedItems/IntersectionPolylines";
import { Button } from "@lib/components/Button";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Radio } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
import { TableSelect, TableSelectOption } from "@lib/components/TableSelect";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Check, Delete, Edit } from "@mui/icons-material";

import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { v4 } from "uuid";

import {
    userSelectedCustomIntersectionPolylineIdAtom,
    userSelectedEnsembleIdentAtom,
    userSelectedGridModelNameAtom,
    userSelectedGridModelParameterDateOrIntervalAtom,
    userSelectedGridModelParameterNameAtom,
    userSelectedRealizationAtom,
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
import { CustomIntersectionPolyline, IntersectionType } from "../typesAndEnums";
import { selectedCustomIntersectionPolylineAtom } from "../view/atoms/derivedAtoms";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): JSX.Element {
    const ensembleSet = props.workbenchSession.getEnsembleSet();
    const statusWriter = useSettingsStatusWriter(props.settingsContext);

    const [showGridLines, setShowGridLines] = props.settingsContext.useSettingsToViewInterfaceState("showGridlines");
    const [gridLayer, setGridLayer] = props.settingsContext.useSettingsToViewInterfaceState("gridLayer");
    const [zFactor, setZFactor] = props.settingsContext.useSettingsToViewInterfaceState("zFactor");
    const [intersectionExtensionLength, setIntersectionExtensionLength] =
        props.settingsContext.useSettingsToViewInterfaceState("intersectionExtensionLength");
    const [polylineEditModeActive, setPolylineEditModeActive] = useAtom(
        editCustomIntersectionPolylineEditModeActiveAtom
    );
    const [polylineAddModeActive, setPolylineAddModeActive] = useAtom(addCustomIntersectionPolylineEditModeActiveAtom);

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

    const [currentCustomIntersectionPolyline, setCurrentCustomIntersectionPolyline] = useAtom(
        currentCustomIntersectionPolylineAtom
    );
    const selectedCustomIntersectionPolyline = useAtomValue(selectedCustomIntersectionPolylineAtom);

    const [showDialog, setShowDialog] = React.useState<boolean>(false);
    const [currentCustomPolylineName, setCurrentCustomPolylineName] = React.useState<string>("");
    const [currentCustomPolylineNameMessage, setCurrentCustomPolylineNameMessage] = React.useState<string | null>(null);

    const polylineNameInputRef = React.useRef<HTMLInputElement>(null);

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

    function handleShowGridLinesChange(event: React.ChangeEvent<HTMLInputElement>) {
        setShowGridLines(event.target.checked);
    }

    function handleGridLayerChange(event: React.ChangeEvent<HTMLInputElement>) {
        setGridLayer(parseInt(event.target.value));
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

    function handleAddPolylineModeChange() {
        if (!polylineAddModeActive) {
            setCurrentCustomIntersectionPolyline([]);
            setPolylineAddModeActive(true);
            return;
        }

        setPolylineAddModeActive(false);
        setShowDialog(true);
        polylineNameInputRef.current?.focus();
    }

    function handleEditPolylineModeChange() {
        if (!polylineEditModeActive) {
            setPolylineEditModeActive(true);
            return;
        }

        setPolylineEditModeActive(false);
    }

    function handleCustomPolylineSelectionChange(customPolylineId: string[]) {
        setSelectedCustomIntersectionPolylineId(customPolylineId.at(0) ?? null);
    }

    function maybeSaveAndApplyCustomIntersectionPolyline() {
        if (currentCustomPolylineName === "") {
            setCurrentCustomPolylineNameMessage("Name must not be empty");
            return;
        }

        if (availableUserCreatedIntersectionPolylines.some((el) => el.name === currentCustomPolylineName)) {
            setCurrentCustomPolylineNameMessage("A polyline with this name already exists");
            return;
        }

        const uuid = v4();
        const newCustomIntersectionPolyline: CustomIntersectionPolyline = {
            id: uuid,
            name: currentCustomPolylineName,
            polyline: currentCustomIntersectionPolyline,
        };
        setSelectedCustomIntersectionPolylineId(uuid);
        /*
        setAvailableCustomIntersectionPolylines([
            ...availableCustomIntersectionPolylines,
            newCustomIntersectionPolyline,
        ]);
        */
        setPolylineAddModeActive(false);
        setPolylineEditModeActive(false);
        setCurrentCustomPolylineName("");
        setCurrentCustomPolylineNameMessage(null);
        setCurrentCustomIntersectionPolyline([]);
        setShowDialog(false);
    }

    function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") {
            maybeSaveAndApplyCustomIntersectionPolyline();
        }
    }

    function discardCustomIntersectionPolyline() {
        setCurrentCustomIntersectionPolyline([]);
        setPolylineAddModeActive(false);
        setPolylineEditModeActive(false);
        setCurrentCustomPolylineName("");
        setCurrentCustomPolylineNameMessage(null);
        setShowDialog(false);
    }

    function handleCurrentCustomPolylineNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        setCurrentCustomPolylineName(event.target.value);
    }

    function handleRemoveCustomPolyline() {
        return;
    }

    /*
    React.useEffect(() => {
        function handleKeyboardEvent(event: KeyboardEvent) {
            if (!polylineAddModeActive && !polylineEditModeActive) {
                return;
            }

            if (event.key === "Escape") {
                discardCustomIntersectionPolyline();
            }

            if (event.key === "Enter") {
                if (polylineAddModeActive) {
                    setShowDialog(true);
                }
                if (polylineEditModeActive) {
                    handleEditPolylineModeChange();
                }
            }
        }

        document.addEventListener("keydown", handleKeyboardEvent);

        return () => {
            document.removeEventListener("keydown", handleKeyboardEvent);
        };
    }, [polylineAddModeActive, polylineEditModeActive]);
    */

    React.useEffect(
        function handleShowDialog() {
            if (showDialog && polylineNameInputRef.current) {
                polylineNameInputRef.current.getElementsByTagName("input")[0].focus();
            }
        },
        [showDialog]
    );

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
                    <Label text="Grid layer">
                        <Input
                            type="number"
                            defaultValue={gridLayer}
                            onChange={handleGridLayerChange}
                            min={-1}
                            max={gridModelDimensions?.k_count}
                        />
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
                        <TableSelect
                            options={makeCustomIntersectionPolylineOptions(
                                availableUserCreatedIntersectionPolylines,
                                selectedCustomIntersectionPolylineId,
                                <div className="flex items-center">
                                    <div
                                        onClick={handleEditPolylineModeChange}
                                        className={resolveClassNames("p-1 hover:underline cursor-pointer", {
                                            "hover:text-blue-200": !polylineEditModeActive,
                                            "hover:text-green-400": polylineEditModeActive,
                                        })}
                                        title={polylineEditModeActive ? "Finish editing polyline" : "Edit polyline"}
                                    >
                                        {polylineEditModeActive ? (
                                            <Check fontSize="small" />
                                        ) : (
                                            <Edit fontSize="small" />
                                        )}
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
