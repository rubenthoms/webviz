import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { MultiEnsembleSelect } from "@framework/components/MultiEnsembleSelect";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Dropdown } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";

import { useAtom, useAtomValue } from "jotai";

import {
    userSelectedEnsembleIdentsAtom,
    userSelectedPvtNumsAtom,
    userSelectedRealizationsAtom,
} from "./atoms/baseAtoms";
import {
    pvtDataAccessorAtom,
    selectedEnsembleIdentsAreValidAtom,
    selectedEnsembleIdentsAtom,
    selectedPvtNumsAreValidAtom,
    selectedPvtNumsAtom,
    selectedRealizationsAreValidAtom,
    selectedRealizationsAtom,
} from "./atoms/derivedAtoms";
import { pvtDataQueriesAtom } from "./atoms/queryAtoms";

import { DependentVariableSelector } from "../components/DependentVariableSelector/dependentVariableSelector";
import { ModuleSerializedState } from "../persistence";
import { Interface, State } from "../state";
import {
    ColorBy,
    PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME,
    PhaseType,
    PressureDependentVariable,
} from "../typesAndEnums";
import { computeRealizationsIntersection } from "../utils/realizationsIntersection";

export function Settings({
    settingsContext,
    workbenchSession,
}: ModuleSettingsProps<State, Interface, ModuleSerializedState>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const filterEnsembleRealizationsFunc = useEnsembleRealizationFilterFunc(workbenchSession);

    const selectedEnsembleIdents = useAtomValue(selectedEnsembleIdentsAtom);
    const [userSelectedEnsembleIdents, setSelectedEnsembleIdents] = useAtom(userSelectedEnsembleIdentsAtom);
    const selectedPvtNums = useAtomValue(selectedPvtNumsAtom);
    const [userSelectedPvtNums, setSelectedPvtNums] = useAtom(userSelectedPvtNumsAtom);
    const pvtDataQueries = useAtomValue(pvtDataQueriesAtom);
    const pvtDataAccessor = useAtomValue(pvtDataAccessorAtom);
    const selectedRealizations = useAtomValue(selectedRealizationsAtom);
    const [userSelectedRealizations, setSelectedRealizations] = useAtom(userSelectedRealizationsAtom);

    const [selectedPhase, setSelectedPhase] = settingsContext.useInterfaceState("selectedPhase");
    const [selectedColorBy, setSelectedColorBy] = settingsContext.useInterfaceState("selectedColorBy");
    const [selectedDependentVariables, setSelectedPlots] =
        settingsContext.useInterfaceState("selectedDependentVariables");

    const [selectedMultiEnsembleIdents, setSelectedMultiEnsembleIdents] =
        React.useState<EnsembleIdent[]>(selectedEnsembleIdents);
    const [selectedMultiRealizations, setSelectedMultiRealizations] = React.useState<number[]>(selectedRealizations);
    const [selectedMultiPvtNums, setSelectedMultiPvtNums] = React.useState<number[]>(selectedPvtNums);

    const invalidEnsembleSelection = useAtomValue(selectedEnsembleIdentsAreValidAtom);
    const invalidRealizationSelection = useAtomValue(selectedRealizationsAreValidAtom);
    const invalidPvtNumSelection = useAtomValue(selectedPvtNumsAreValidAtom);

    function handleEnsembleSelectionChange(ensembleIdents: EnsembleIdent[]) {
        setSelectedEnsembleIdents(ensembleIdents);
        setSelectedMultiEnsembleIdents(ensembleIdents);
    }

    function handleRealizationSelectionChange(values: string[]) {
        const newRealizations = values.map((value) => parseInt(value) as number);
        setSelectedRealizations(newRealizations);
        setSelectedMultiRealizations(newRealizations);
    }

    function handlePvtNumChange(values: string[]) {
        const newPvtNums = values.map((value) => parseInt(value) as number);
        setSelectedPvtNums(newPvtNums);
        setSelectedMultiPvtNums(newPvtNums);
    }

    function handleColorByChange(_: React.ChangeEvent<HTMLInputElement>, colorBy: ColorBy) {
        setSelectedColorBy(colorBy);
        if (colorBy === ColorBy.PVT_NUM) {
            if (userSelectedEnsembleIdents.isPersistedValue) {
                setSelectedEnsembleIdents([userSelectedEnsembleIdents.value[0]]);
            } else {
                setSelectedEnsembleIdents([selectedMultiEnsembleIdents[0]]);
            }
            if (userSelectedRealizations.isPersistedValue) {
                setSelectedRealizations([userSelectedRealizations.value[0]]);
            } else {
                setSelectedRealizations([selectedMultiRealizations[0]]);
            }
            if (userSelectedPvtNums.isPersistedValue) {
                setSelectedPvtNums([userSelectedPvtNums.value[0]]);
            } else {
                setSelectedPvtNums(selectedMultiPvtNums);
            }
        } else {
            if (userSelectedEnsembleIdents.isPersistedValue) {
                setSelectedEnsembleIdents(userSelectedEnsembleIdents.value);
            } else {
                setSelectedEnsembleIdents(selectedMultiEnsembleIdents);
            }
            if (userSelectedRealizations.isPersistedValue) {
                setSelectedRealizations(userSelectedRealizations.value);
            } else {
                setSelectedRealizations(selectedMultiRealizations);
            }
            if (userSelectedPvtNums.isPersistedValue) {
                setSelectedPvtNums(userSelectedPvtNums.value);
            } else {
                setSelectedPvtNums([selectedMultiPvtNums[0]]);
            }
        }
    }

    function handlePhasesChange(value: string) {
        setSelectedPhase(value as PhaseType);
    }

    function handleVisualizePlotsChange(plots: string[]) {
        const orderedPlots = [
            PressureDependentVariable.FORMATION_VOLUME_FACTOR,
            PressureDependentVariable.DENSITY,
            PressureDependentVariable.VISCOSITY,
            PressureDependentVariable.FLUID_RATIO,
        ];
        setSelectedPlots(orderedPlots.filter((plot) => plots.includes(plot)));
    }

    let errorMessage = "";
    if (pvtDataQueries.allQueriesFailed) {
        errorMessage = "Failed to fetch PVT data. Make sure the selected ensemble has PVT data.";
    }

    let realizations: number[] = [];
    if (!invalidEnsembleSelection) {
        realizations = computeRealizationsIntersection(selectedEnsembleIdents, filterEnsembleRealizationsFunc);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Color by" expanded>
                <RadioGroup
                    options={[
                        { label: "Ensemble", value: ColorBy.ENSEMBLE },
                        { label: "PVTNum", value: ColorBy.PVT_NUM },
                    ]}
                    value={selectedColorBy}
                    onChange={handleColorByChange}
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Ensembles" expanded>
                <MultiEnsembleSelect
                    ensembleSet={ensembleSet}
                    onChange={handleEnsembleSelectionChange}
                    value={invalidEnsembleSelection ? [] : selectedEnsembleIdents}
                    size={5}
                    multiple={selectedColorBy === ColorBy.ENSEMBLE}
                    invalid={invalidEnsembleSelection}
                    invalidMessage="Persisted ensemble selection is no longer valid. Please select one or more valid ensembles."
                />
            </CollapsibleGroup>
            <CollapsibleGroup title="Realizations" expanded>
                <Select
                    options={makeRealizationOptions(realizations)}
                    value={invalidRealizationSelection ? [] : selectedRealizations.map((el) => el.toString())}
                    onChange={handleRealizationSelectionChange}
                    size={5}
                    multiple={selectedColorBy === ColorBy.ENSEMBLE}
                    invalid={invalidRealizationSelection}
                    invalidMessage="Persisted realization selection is no longer valid. Please select one or more valid realizations."
                />
            </CollapsibleGroup>
            <PendingWrapper isPending={pvtDataQueries.isFetching} errorMessage={errorMessage}>
                <CollapsibleGroup title="PVT Num" expanded>
                    <Select
                        options={makePvtNumOptions(pvtDataAccessor.getUniquePvtNums())}
                        value={invalidPvtNumSelection ? [] : selectedPvtNums.map((el) => el.toString())}
                        onChange={handlePvtNumChange}
                        size={5}
                        multiple={selectedColorBy === ColorBy.PVT_NUM}
                        invalid={invalidPvtNumSelection}
                        invalidMessage="Persisted PVT num selection is no longer valid. Please select one or more valid PVT nums."
                    />
                </CollapsibleGroup>
                <CollapsibleGroup title="Phase" expanded>
                    <Dropdown options={makePhaseOptions()} value={selectedPhase} onChange={handlePhasesChange} />
                </CollapsibleGroup>
                <CollapsibleGroup title="Show plot for" expanded>
                    <DependentVariableSelector
                        dependentVariables={makeDependentVariableOptions(selectedPhase)}
                        value={selectedDependentVariables}
                        onChange={handleVisualizePlotsChange}
                    />
                </CollapsibleGroup>
            </PendingWrapper>
        </div>
    );
}

function makePvtNumOptions(pvtNums: number[]): SelectOption[] {
    return pvtNums.map((pvtNum) => ({ label: pvtNum.toString(), value: pvtNum.toString() }));
}

function makePhaseOptions(): SelectOption[] {
    return [
        {
            label: "Oil (PVTO)",
            value: PhaseType.OIL,
        },
        {
            label: "Gas (PVTG)",
            value: PhaseType.GAS,
        },
        {
            label: "Water (PVTW)",
            value: PhaseType.WATER,
        },
    ];
}

function makeDependentVariableOptions(phaseType: PhaseType): PressureDependentVariable[] {
    const plots: PressureDependentVariable[] = [];

    for (const variable of Object.keys(PRESSURE_DEPENDENT_VARIABLE_TO_DISPLAY_NAME)) {
        if (variable === PressureDependentVariable.FLUID_RATIO && phaseType === PhaseType.WATER) {
            continue;
        }
        plots.push(variable as PressureDependentVariable);
    }

    return plots;
}

function makeRealizationOptions(realizations: number[]): SelectOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}
