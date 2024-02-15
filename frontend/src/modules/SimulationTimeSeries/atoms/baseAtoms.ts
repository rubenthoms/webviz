import { Frequency_api, StatisticFunction_api } from "@api";
import { atom } from "jotai";
import { isEqual } from "lodash";
import { FanchartStatisticOption, GroupBy, StatisticsSelection, VisualizationMode } from "../typesAndEnums";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { atomWithCompare } from "@framework/utils/atomUtils";
import { ParameterIdent } from "@framework/EnsembleParameters";

export const resampleFrequencyAtom = atom<Frequency_api | null>(Frequency_api.MONTHLY);

export const groupByAtom = atom<GroupBy>(GroupBy.TIME_SERIES);

export const colorRealizationsByParameterAtom = atom<boolean>(false);

export const visualizationModeAtom = atom<VisualizationMode>(VisualizationMode.STATISTICAL_FANCHART);

export const showHistoricalAtom = atom<boolean>(true);

export const showObservationsAtom = atom<boolean>(true);

export const statisticsSelectionAtom = atom<StatisticsSelection>({
    IndividualStatisticsSelection: Object.values(StatisticFunction_api),
    FanchartStatisticsSelection: Object.values(FanchartStatisticOption),
});

export const userSelectedEnsembleIdentsAtom = atomWithCompare<EnsembleIdent[]>([], isEqual);

export const selectedVectorNamesAtom = atomWithCompare<string[]>([], isEqual);

export const filteredParameterIdentListAtom = atom<ParameterIdent[]>([]);

export const userSelectedParameterIdentStringAtom = atom<string | null>(null);

export const userSelectedActiveTimestampUtcMsAtom = atom<number | null>(null);