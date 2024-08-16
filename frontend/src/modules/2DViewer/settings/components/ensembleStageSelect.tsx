import React from "react";

import { SurfaceStatisticFunction_api } from "@api";
import { Ensemble } from "@framework/Ensemble";
import { EnsembleSensitivities } from "@framework/EnsembleSensitivities";
import { Dropdown } from "@lib/components/Dropdown";
import { useValidState } from "@lib/hooks/useValidState";

export enum EnsembleStageType {
    Statistics = "Statistics",
    Realization = "Realization",
    Observation = "Observation",
}
export type EnsembleStatisticStage = {
    ensembleStage: EnsembleStageType.Statistics;
    statisticFunction: SurfaceStatisticFunction_api;
    realizationNums: number[];
};

export type EnsembleRealizationStage = {
    ensembleStage: EnsembleStageType.Realization;
    realizationNum: number | null;
};
export type EnsembleObservationStage = {
    ensembleStage: EnsembleStageType.Observation;
    realizationNum: number | null; // The observation might be tied to a realization (e.g., depth converted)
};

export type EnsembleStage = EnsembleStatisticStage | EnsembleRealizationStage | EnsembleObservationStage;

enum StageDetails {
    Realization = "Realization",
    MEAN = "Mean",
    STD = "Stddev",
    P10 = "P10",
    P90 = "P90",
    Observation = "Observation",
}

export type EnsembleStageSelectProps = {
    ensemble: Ensemble | null;
    stageType: EnsembleStageType | null;
    availableRealizationNums: number[];
    realizationNum: number | null;
    statisticFunction: SurfaceStatisticFunction_api;
    disableRealizationPicker?: boolean;
    onChange(stage: EnsembleStage): void;
};

export const EnsembleStageSelect: React.FC<EnsembleStageSelectProps> = (props) => {
    const ensembleSensitivities = props.ensemble?.getSensitivities() ?? null;
    const [stageDetails, setStageDetails] = useValidState<StageDetails>({
        initialState: getStageDetails(props.stageType || EnsembleStageType.Realization, props.statisticFunction),
        validStates: Object.values(StageDetails),
    });
    const [realizationNum, setRealizationNum] = useValidState<number | null>({
        initialState: props.realizationNum,
        validStates: props.availableRealizationNums,
    });
    const [realizationNumsStatistics, setRealizationNumsStatistics] = React.useState<number[]>([]);

    const realizationOptions = props.availableRealizationNums.map((num) => ({
        label: num.toString(),
        value: num.toString(),
    }));
    const StageDetailOptions = Object.values(StageDetails).map((val: StageDetails) => {
        return { value: val, label: val };
    });

    function handleRealizationNumChange(realNum: string) {
        setRealizationNum(parseInt(realNum));
    }
    React.useEffect(() => {
        if (
            ensembleSensitivities &&
            !realizationNumsStatistics.length &&
            stageDetails !== StageDetails.Realization &&
            stageDetails !== StageDetails.Observation
        ) {
            return;
        }
        const stage = handleStageChange(stageDetails, realizationNumsStatistics, realizationNum);

        props.onChange(stage);
    }, [stageDetails, realizationNum, realizationNumsStatistics]);

    return (
        <div className="w-full  flex">
            <div className="flex-grow">
                <Dropdown
                    options={StageDetailOptions}
                    value={stageDetails}
                    onChange={(stage: string) => setStageDetails(stage as StageDetails)}
                />
            </div>
            {stageDetails === StageDetails.Realization && (
                <div className="flex-grow">
                    <Dropdown
                        options={realizationOptions}
                        value={props.realizationNum?.toString()}
                        onChange={handleRealizationNumChange}
                        disabled={props.disableRealizationPicker}
                        showArrows
                    />
                </div>
            )}
            <>
                {stageDetails !== StageDetails.Realization &&
                    stageDetails !== StageDetails.Observation &&
                    ensembleSensitivities && (
                        <SensitivitySelect
                            sensitivities={ensembleSensitivities}
                            realizationNums={realizationNumsStatistics}
                            onChange={setRealizationNumsStatistics}
                        />
                    )}
            </>
            {props.stageType === EnsembleStageType.Observation && <div className="flex-grow"></div>}
        </div>
    );
};

type SensitivitySelectProps = {
    sensitivities: EnsembleSensitivities;
    realizationNums: number[];
    onChange(realizationNums: number[]): void;
};
export const SensitivitySelect: React.FC<SensitivitySelectProps> = (props) => {
    const [selectedSensitivtyName, setSelectedSensitivtyName] = useValidState<string | null>({
        initialState: null,
        validStates: props.sensitivities.getSensitivityNames(),
    });

    const sensitivityNameOptions = props.sensitivities
        .getSensitivityNames()
        .map((name) => ({ label: name, value: name }));
    function getSensitivityCases(sensitivityName: string): string[] {
        return props.sensitivities.getCaseNamesForSensitivity(sensitivityName);
    }

    const [selectedSensitivityCase, setSelectedSensitivityCase] = useValidState<string | null>({
        initialState: null,
        validStates: selectedSensitivtyName ? getSensitivityCases(selectedSensitivtyName) : [],
    });

    const sensitivityCaseOptions = (sensitivityName: string | null) => {
        if (sensitivityName) {
            return getSensitivityCases(sensitivityName).map((name) => ({ label: name, value: name }));
        }
        return [];
    };
    if (selectedSensitivtyName && selectedSensitivityCase) {
        const sensitivityCase = props.sensitivities.getCaseByName(selectedSensitivtyName, selectedSensitivityCase);
        if (sensitivityCase) {
            props.onChange(sensitivityCase.realizations);
        }
    }
    return (
        <>
            <Dropdown
                options={sensitivityNameOptions}
                value={selectedSensitivtyName ?? ""}
                onChange={setSelectedSensitivtyName}
            />
            <Dropdown
                options={sensitivityCaseOptions(selectedSensitivtyName)}
                value={selectedSensitivityCase ?? ""}
                onChange={setSelectedSensitivityCase}
            />
        </>
    );
};

function handleStageChange(
    stage: string,
    realizationNumsStatistics: number[],
    realizationNum: number | null
): EnsembleStage {
    if (stage == StageDetails.MEAN) {
        return {
            ensembleStage: EnsembleStageType.Statistics,
            statisticFunction: SurfaceStatisticFunction_api.MEAN,
            realizationNums: realizationNumsStatistics ?? [],
        };
    }
    if (stage == StageDetails.STD) {
        return {
            ensembleStage: EnsembleStageType.Statistics,
            statisticFunction: SurfaceStatisticFunction_api.STD,
            realizationNums: realizationNumsStatistics ?? [],
        };
    }
    if (stage == StageDetails.P10) {
        return {
            ensembleStage: EnsembleStageType.Statistics,
            statisticFunction: SurfaceStatisticFunction_api.P10,
            realizationNums: realizationNumsStatistics ?? [],
        };
    }
    if (stage == StageDetails.P90) {
        return {
            ensembleStage: EnsembleStageType.Statistics,
            statisticFunction: SurfaceStatisticFunction_api.P90,
            realizationNums: realizationNumsStatistics ?? [],
        };
    }
    if (stage == StageDetails.Observation) {
        return {
            ensembleStage: EnsembleStageType.Observation,
            realizationNum: realizationNum ?? 0,
        };
    }

    return {
        ensembleStage: EnsembleStageType.Realization,
        realizationNum: realizationNum ?? 0,
    };
}
function getStageDetails(stage: EnsembleStageType, statisticFunction: SurfaceStatisticFunction_api): StageDetails {
    if (stage === EnsembleStageType.Realization) {
        return StageDetails.Realization;
    }
    if (stage === EnsembleStageType.Statistics) {
        if (statisticFunction === SurfaceStatisticFunction_api.MEAN) {
            return StageDetails.MEAN;
        }
        if (statisticFunction === SurfaceStatisticFunction_api.STD) {
            return StageDetails.STD;
        }
        if (statisticFunction === SurfaceStatisticFunction_api.P10) {
            return StageDetails.P10;
        }
        if (statisticFunction === SurfaceStatisticFunction_api.P90) {
            return StageDetails.P90;
        }
    }
    if (stage === EnsembleStageType.Observation) {
        return StageDetails.Observation;
    }
    return StageDetails.Realization;
}
