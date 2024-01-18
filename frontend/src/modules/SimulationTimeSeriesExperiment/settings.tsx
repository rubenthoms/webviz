import React from "react";

import { Frequency_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useBusinessLogic } from "@framework/ModuleBusinessLogic";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { Checkbox } from "@lib/components/Checkbox";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { LoadingWrapper } from "@lib/components/LoadingWrapper";
import { Select } from "@lib/components/Select";

import { sortBy, sortedUniq } from "lodash";

import { BusinessLogic } from "./businessLogic";
import { State } from "./state";

//-----------------------------------------------------------------------------------------------------------
export function Settings({
    moduleContext,
    workbenchSession,
    workbenchServices,
    businessLogic,
}: ModuleFCProps<State, BusinessLogic>) {
    const state = useBusinessLogic(businessLogic);

    const ensembleSet = useEnsembleSet(workbenchSession);

    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const computedEnsemble = state.userSelections.ensembleIdent
        ? ensembleSet.findEnsemble(state.userSelections.ensembleIdent)
        : null;

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        businessLogic.setEnsembleIdent(ensembleIdent);
        if (ensembleIdent) {
            syncHelper.publishValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles", [ensembleIdent]);
        }
    }

    function handleVectorSelectionChange(vectors: string[]) {
        businessLogic.setVector(vectors[0]);
    }

    function handleFrequencySelectionChange(newFreqStr: string) {
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}`);
        let newFreq: Frequency_api | null = null;
        if (newFreqStr !== "RAW") {
            newFreq = newFreqStr as Frequency_api;
        }
        console.debug(`handleFrequencySelectionChange()  newFreqStr=${newFreqStr}  newFreq=${newFreq}`);
        businessLogic.setResamplingFrequency(newFreq);
    }

    function handleShowStatisticsCheckboxChange(event: React.ChangeEvent<HTMLInputElement>) {
        businessLogic.setShowStatistics(event.target.checked);
    }

    function handleShowRealizations(event: React.ChangeEvent<HTMLInputElement>) {
        businessLogic.setShowRealizations(event.target.checked);
    }

    function handleShowHistorical(event: React.ChangeEvent<HTMLInputElement>) {
        businessLogic.setShowHistorical(event.target.checked);
    }

    function handleRealizationRangeTextChanged(event: React.ChangeEvent<HTMLInputElement>) {
        const realRangeStr = event.target.value;
        console.debug("handleRealizationRangeTextChanged() " + realRangeStr);
        let rangeArr: number[] | null = null;
        if (realRangeStr) {
            rangeArr = parseRealizationRangeString(realRangeStr, computedEnsemble?.getMaxRealizationNumber() ?? -1);
        }
        console.debug(rangeArr);
        moduleContext.getStateStore().setValue("realizationsToInclude", rangeArr);
    }

    return (
        <>
            <Label text="Ensemble" synced={syncHelper.isSynced(SyncSettingKey.ENSEMBLE)}>
                <SingleEnsembleSelect
                    ensembleSet={ensembleSet}
                    value={state.userSelections.ensembleIdent}
                    onChange={handleEnsembleSelectionChange}
                />
            </Label>
            <Label text="Vector" synced={syncHelper.isSynced(SyncSettingKey.TIME_SERIES)}>
                <LoadingWrapper isLoading={state.loadingStates.vectors}>
                    <Select
                        options={state.fetchedData.vectorDescriptions.map((vector) => ({
                            value: vector.name,
                            label: vector.name,
                        }))}
                        value={[state.userSelections.vector]}
                        onChange={handleVectorSelectionChange}
                        filter={true}
                        size={5}
                    />
                </LoadingWrapper>
            </Label>
            <Label text="Frequency">
                <Dropdown
                    options={makeFrequencyOptionItems()}
                    value={state.userSelections.resamplingFrequency ?? "RAW"}
                    onChange={handleFrequencySelectionChange}
                />
            </Label>
            <Checkbox
                label="Show statistics"
                checked={state.userSelections.showStatistics}
                onChange={handleShowStatisticsCheckboxChange}
            />
            <Checkbox
                label="Show realizations"
                checked={state.userSelections.showRealizations}
                onChange={handleShowRealizations}
            />
            <Checkbox
                label="Show historical"
                checked={state.userSelections.showHistorical}
                disabled={!state.utilityStates.hasHistoricalVector}
                onChange={handleShowHistorical}
            />
            <Label text={`Realizations (maxReal=${computedEnsemble?.getMaxRealizationNumber() ?? -1})`}>
                <Input onChange={handleRealizationRangeTextChanged} />
            </Label>
        </>
    );
}

function makeFrequencyOptionItems(): DropdownOption[] {
    const itemArr: DropdownOption[] = [
        { value: Frequency_api.DAILY, label: "Daily" },
        { value: Frequency_api.MONTHLY, label: "Monthly" },
        { value: Frequency_api.QUARTERLY, label: "Quarterly" },
        { value: Frequency_api.YEARLY, label: "Yearly" },
        { value: "RAW", label: "None (raw)" },
    ];
    return itemArr;
}

// Parse realization ranges into array of numbers
function parseRealizationRangeString(realRangeStr: string, maxLegalReal: number): number[] {
    const realArr: number[] = [];

    const rangeArr = realRangeStr.split(",");
    for (const aRange of rangeArr) {
        const rangeParts = aRange.split("-");
        if (rangeParts.length === 1) {
            const real = parseInt(rangeParts[0], 10);
            if (real >= 0 && real <= maxLegalReal) {
                realArr.push(real);
            }
        } else if (rangeParts.length === 2) {
            const startReal = parseInt(rangeParts[0], 10);
            const endReal = parseInt(rangeParts[1], 10);
            if (startReal >= 0 && startReal <= maxLegalReal && endReal >= startReal) {
                for (let i = startReal; i <= Math.min(endReal, maxLegalReal); i++) {
                    realArr.push(i);
                }
            }
        }
    }

    // Sort and remove duplicates
    return sortedUniq(sortBy(realArr));
}
