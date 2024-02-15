import { SummaryVectorObservations_api } from "@api";
import { ColorSet } from "@lib/utils/ColorSet";
import { Size2D } from "@lib/utils/geometry";

import { useAtomValue } from "jotai";
import { Layout } from "plotly.js";

import { useMakeEnsembleDisplayNameFunc } from "./useMakeEnsembleDisplayNameFunc";

import {
    groupByAtom,
    showHistoricalAtom,
    showObservationsAtom,
    statisticsSelectionAtom,
    visualizationModeAtom,
} from "../atoms/baseAtoms";
import { vectorSpecificationsAtom } from "../atoms/derivedSettingsAtoms";
import {
    activeTimestampUtcMsAtom,
    colorByParameterAtom,
    loadedVectorSpecificationsAndHistoricalDataAtom,
    loadedVectorSpecificationsAndRealizationDataAtom,
    loadedVectorSpecificationsAndStatisticsDataAtom,
} from "../atoms/derivedViewAtoms";
import { vectorObservationsQueriesAtom } from "../atoms/queryAtoms";
import { GroupBy, VectorSpec, VisualizationMode } from "../typesAndEnums";
import { EnsemblesContinuousParameterColoring } from "../utils/ensemblesContinuousParameterColoring";
import { SubplotBuilder, SubplotOwner } from "../utils/subplotBuilder";
import { TimeSeriesPlotData } from "../utils/timeSeriesPlotData";
import {
    filterVectorSpecificationAndFanchartStatisticsDataArray,
    filterVectorSpecificationAndIndividualStatisticsDataArray,
} from "../utils/vectorSpecificationsAndQueriesUtils";

export function useSubplotBuilder(
    wrapperDivSize: Size2D,
    colorSet: ColorSet,
    ensemblesParameterColoring: EnsemblesContinuousParameterColoring | null
): [Partial<TimeSeriesPlotData>[], Partial<Layout>] {
    const groupBy = useAtomValue(groupByAtom);
    const visualizationMode = useAtomValue(visualizationModeAtom);
    const showObservations = useAtomValue(showObservationsAtom);
    const vectorSpecifications = useAtomValue(vectorSpecificationsAtom);
    const showHistorical = useAtomValue(showHistoricalAtom);
    const statisticsSelection = useAtomValue(statisticsSelectionAtom);
    const vectorObservationsQueries = useAtomValue(vectorObservationsQueriesAtom);
    const loadedVectorSpecificationsAndRealizationData = useAtomValue(loadedVectorSpecificationsAndRealizationDataAtom);
    const loadedVectorSpecificationsAndStatisticsData = useAtomValue(loadedVectorSpecificationsAndStatisticsDataAtom);
    const loadedVectorSpecificationsAndHistoricalData = useAtomValue(loadedVectorSpecificationsAndHistoricalDataAtom);
    const colorByParameter = useAtomValue(colorByParameterAtom);
    const activeTimestampUtcMs = useAtomValue(activeTimestampUtcMsAtom);

    const makeEnsembleDisplayName = useMakeEnsembleDisplayNameFunc();

    const subplotOwner = groupBy === GroupBy.TIME_SERIES ? SubplotOwner.VECTOR : SubplotOwner.ENSEMBLE;

    const scatterType =
        visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS ||
        visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS
            ? "scattergl"
            : "scatter";

    const loadedVectorSpecificationsAndObservationData: {
        vectorSpecification: VectorSpec;
        data: SummaryVectorObservations_api;
    }[] = [];
    vectorObservationsQueries.ensembleVectorObservationDataMap.forEach((ensembleObservationData) => {
        if (showObservations && !ensembleObservationData.hasSummaryObservations) {
            return;
        }

        loadedVectorSpecificationsAndObservationData.push(...ensembleObservationData.vectorsObservationData);
    });

    const subplotBuilder = new SubplotBuilder(
        subplotOwner,
        vectorSpecifications ?? [],
        makeEnsembleDisplayName,
        colorSet,
        wrapperDivSize.width,
        wrapperDivSize.height,
        ensemblesParameterColoring ?? undefined,
        scatterType
    );

    // Add traces based on visualization mode
    if (colorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        subplotBuilder.addRealizationTracesColoredByParameter(loadedVectorSpecificationsAndRealizationData);
    }
    if (!colorByParameter && visualizationMode === VisualizationMode.INDIVIDUAL_REALIZATIONS) {
        const useIncreasedBrightness = false;
        subplotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_FANCHART) {
        const selectedVectorsFanchartStatisticData = filterVectorSpecificationAndFanchartStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.FanchartStatisticsSelection
        );
        subplotBuilder.addFanchartTraces(selectedVectorsFanchartStatisticData);
    }
    if (visualizationMode === VisualizationMode.STATISTICAL_LINES) {
        const highlightStatistics = false;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
        );
        subplotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (visualizationMode === VisualizationMode.STATISTICS_AND_REALIZATIONS) {
        const useIncreasedBrightness = true;
        const highlightStatistics = true;
        const selectedVectorsIndividualStatisticData = filterVectorSpecificationAndIndividualStatisticsDataArray(
            loadedVectorSpecificationsAndStatisticsData,
            statisticsSelection.IndividualStatisticsSelection
        );
        subplotBuilder.addRealizationsTraces(loadedVectorSpecificationsAndRealizationData, useIncreasedBrightness);
        subplotBuilder.addStatisticsTraces(selectedVectorsIndividualStatisticData, highlightStatistics);
    }
    if (showHistorical) {
        subplotBuilder.addHistoryTraces(loadedVectorSpecificationsAndHistoricalData);
    }
    if (showObservations) {
        subplotBuilder.addObservationsTraces(loadedVectorSpecificationsAndObservationData);
    }

    if (activeTimestampUtcMs) {
        subplotBuilder.addTimeAnnotation(activeTimestampUtcMs);
    }

    const plotData = subplotBuilder.createPlotData();
    const plotLayout = subplotBuilder.createPlotLayout();

    return [plotData, plotLayout];
}
