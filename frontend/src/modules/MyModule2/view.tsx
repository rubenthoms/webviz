import React from "react";

import { WellBoreCompletion_api } from "@api";
import {
    InternalLayerOptions,
    IntersectionReferenceSystem,
    Perforation,
    SchematicData,
    SurfaceLine,
    getPicksData,
    getSeismicInfo,
    getSeismicOptions,
    transformFormationData,
} from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useSeismicFenceDataQuery } from "@modules/SeismicIntersection/queryHooks";
import { makeTrajectoryXyzPointsFromWellboreTrajectory } from "@modules/SeismicIntersection/utils/esvIntersectionDataConversion";
import { useWellTrajectoriesQuery } from "@modules/_shared/WellBore";
import {
    useWellboreCompletionsQuery,
    useWellborePicksAndStratigraphicUnitsQuery,
} from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import { LayerItem, LayerType } from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { createEsvWellborePicksAndStratigraphicUnits } from "@modules/_shared/components/EsvIntersection/utils/dataConversion";
import { makeSurfaceStatisticalFanchartFromRealizationSurfaces } from "@modules/_shared/components/EsvIntersection/utils/surfaceStatisticalFancharts";

import { isEqual } from "lodash";

import { getPolyLineIntersection } from "./data/data";
import { useSampleSurfaceInPointsQueries } from "./queryHooks";
import { SeismicDataType, State } from "./state";
import {
    createSeismicSliceImageDataArrayFromFenceData,
    createSeismicSliceImageYAxisValuesArrayFromFenceData,
} from "./utils/esvIntersectionDataConversion";
import { SeismicSliceImageOptions, useGenerateSeismicSliceImageData } from "./utils/esvIntersectionHooks";

export const View = (props: ModuleFCProps<State>) => {
    const statusWriter = useViewStatusWriter(props.moduleContext);

    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const realizations = props.moduleContext.useStoreValue("realizations");
    const wellboreHeader = props.moduleContext.useStoreValue("wellboreHeader");
    const surfaceAttribute = props.moduleContext.useStoreValue("surfaceAttribute");
    const surfaceNames = props.moduleContext.useStoreValue("surfaceNames");
    const stratigraphyColorMap = props.moduleContext.useStoreValue("stratigraphyColorMap");
    const seismicAttribute = props.moduleContext.useStoreValue("seismicAttribute");
    const seismicTime = props.moduleContext.useStoreValue("seismicTimestamp");
    const seismicDataType = props.moduleContext.useStoreValue("seismicDataType");
    // const seismicTimeType = props.moduleContext.useStoreValue("seismicTimeType");

    const visibleLayers = props.moduleContext.useStoreValue("visibleLayers");
    const visibleStatisticCurves = props.moduleContext.useStoreValue("visibleStatisticCurves");

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const seismicColors = props.workbenchSettings
        .useDiscreteColorScale({
            gradientType: ColorScaleGradientType.Diverging,
        })
        .getColorPalette()
        .getColors();

    const [ris, setRis] = React.useState<IntersectionReferenceSystem | null>(null);
    const [prevTrajectoryPoint, setPrevTrajectoryPoint] = React.useState<number[][]>([]);
    const [polylineIntersectionLayer, setPolylineIntersectionLayer] = React.useState<LayerItem<any> | null>(null);

    const wellboreTrajectoriesQuery = useWellTrajectoriesQuery(
        wellboreHeader ? [wellboreHeader.wellbore_uuid] : undefined
    );
    if (wellboreTrajectoriesQuery.isError) {
        statusWriter.addError("Error loading well trajectories");
    }

    const wellboreCompletionsQuery = useWellboreCompletionsQuery(
        wellboreHeader?.wellbore_uuid,
        wellboreHeader !== undefined
    );

    const wellborePicksAndStratigraphicUnitsQuery = useWellborePicksAndStratigraphicUnitsQuery(
        ensembleIdent?.getCaseUuid(),
        wellboreHeader?.wellbore_uuid,
        true
    );

    if (wellborePicksAndStratigraphicUnitsQuery.isError) {
        statusWriter.addError("Error loading wellbore picks and stratigraphic units");
    }

    let trajectoryXyzPoints: number[][] = [];

    if (wellboreTrajectoriesQuery.data && wellboreTrajectoriesQuery.data.length !== 0) {
        trajectoryXyzPoints = makeTrajectoryXyzPointsFromWellboreTrajectory(wellboreTrajectoriesQuery.data[0]);
        if (!isEqual(trajectoryXyzPoints, prevTrajectoryPoint)) {
            setPrevTrajectoryPoint(trajectoryXyzPoints);
            const referenceSystem = new IntersectionReferenceSystem(trajectoryXyzPoints);
            referenceSystem.offset = wellboreTrajectoriesQuery.data[0].md_arr[0]; // Offset should be md at start of path
            setRis(referenceSystem);
        }
    }

    const xPoints = trajectoryXyzPoints.map((coord) => coord[0]) ?? [];
    const yPoints = trajectoryXyzPoints.map((coord) => coord[1]) ?? [];

    let cumLength: number[] = [];

    if (trajectoryXyzPoints) {
        cumLength = IntersectionReferenceSystem.toDisplacement(trajectoryXyzPoints, 0).map((coord) => coord[0]);
    }

    const sampleSurfaceInPointsQueries = useSampleSurfaceInPointsQueries(
        ensembleIdent?.getCaseUuid() ?? "",
        ensembleIdent?.getEnsembleName() ?? "",
        surfaceNames ?? [],
        surfaceAttribute ?? "",
        realizations ?? [],
        xPoints,
        yPoints,
        true
    );

    statusWriter.setLoading(wellboreTrajectoriesQuery.isFetching || sampleSurfaceInPointsQueries.isFetching);

    let errorString = "";
    if (wellboreTrajectoriesQuery.isError) {
        errorString += "Error loading well trajectories";
    }

    if (errorString !== "") {
        statusWriter.addError(errorString);
    }

    // Get seismic fence data from polyline
    const seismicFenceDataQuery = useSeismicFenceDataQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        realizations[0] ?? null,
        seismicAttribute ?? null,
        seismicTime ?? null,
        seismicDataType === SeismicDataType.OBSERVED ?? null,
        {
            x_points: trajectoryXyzPoints.map((coord) => coord[0]),
            y_points: trajectoryXyzPoints.map((coord) => coord[1]),
        },
        !!(
            ensembleIdent &&
            realizations.length > 0 &&
            seismicAttribute &&
            seismicTime &&
            seismicDataType &&
            trajectoryXyzPoints
        )
    );
    if (seismicFenceDataQuery.isError) {
        statusWriter.addError("Error loading seismic fence data");
    }

    const [generateSeismicSliceImageOptions, setGenerateSeismicSliceImageOptions] =
        React.useState<SeismicSliceImageOptions | null>(null);
    const generatedSeismicSliceImageData = useGenerateSeismicSliceImageData(generateSeismicSliceImageOptions);

    React.useEffect(() => {
        const promises = [getPolyLineIntersection()];
        Promise.all(promises).then((values) => {
            const [polylineIntersection] = values;

            setPolylineIntersectionLayer({
                id: "polyline-intersection",
                type: LayerType.POLYLINE_INTERSECTION,
                hoverable: true,
                options: {
                    data: polylineIntersection,
                    colorScale,
                },
            });
        });
    }, [colorScale]);

    const surfaceStatisticsFancharts = sampleSurfaceInPointsQueries.data.map((surface) => {
        const fanchart = makeSurfaceStatisticalFanchartFromRealizationSurfaces(
            surface.realizationPoints.map((el) => el.sampled_values),
            cumLength,
            surface.surfaceName,
            stratigraphyColorMap,
            visibleStatisticCurves
        );
        return fanchart;
    });

    const layers: LayerItem<any>[] = [
        {
            id: "wellborepath",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                order: 3,
                stroke: "red",
                strokeWidth: "2px",
                referenceSystem: ris,
            },
        },
        {
            id: "geomodel",
            type: LayerType.SURFACE_STATISTICAL_FANCHARTS_CANVAS,
            hoverable: true,
            options: {
                order: 4,
                data: {
                    fancharts: surfaceStatisticsFancharts,
                },
            },
        },
        {
            id: "geomodel-labels",
            type: LayerType.GEOMODEL_LABELS,
            options: {
                order: 5,
                data: {
                    lines: surfaceStatisticsFancharts.map((fanchart) => {
                        const line: SurfaceLine = {
                            color: fanchart.color ?? "black",
                            label: fanchart.label ?? "Surface",
                            data: fanchart.data.mean,
                        };
                        return line;
                    }),
                    areas: [],
                },
            },
        },
    ];

    if (polylineIntersectionLayer) {
        layers.push(polylineIntersectionLayer);
    }

    if (seismicFenceDataQuery.data) {
        const newExtendedWellboreTrajectoryXyProjection: number[][] = trajectoryXyzPoints
            ? IntersectionReferenceSystem.toDisplacement(trajectoryXyzPoints, ris?.offset)
            : [];

        const newSeismicImageDataArray = createSeismicSliceImageDataArrayFromFenceData(seismicFenceDataQuery.data);
        const newSeismicImageYAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(
            seismicFenceDataQuery.data
        );

        const newGenerateSeismicSliceImageOptions: SeismicSliceImageOptions = {
            dataValues: newSeismicImageDataArray,
            yAxisValues: newSeismicImageYAxisValues,
            trajectoryXyPoints: newExtendedWellboreTrajectoryXyProjection,
            colormap: seismicColors,
            extension: 0,
        };

        if (!isEqual(generateSeismicSliceImageOptions, newGenerateSeismicSliceImageOptions)) {
            setGenerateSeismicSliceImageOptions(newGenerateSeismicSliceImageOptions);
        }
    }

    if (wellboreHeader && wellboreTrajectoriesQuery.data) {
        const tvdStart = wellboreTrajectoriesQuery.data[0].tvd_msl_arr[0] - wellboreTrajectoriesQuery.data[0].md_arr[0];
        if (tvdStart !== undefined) {
            layers.push({
                id: "sea-and-rkb",
                type: LayerType.REFERENCE_LINE,
                options: {
                    data: [
                        {
                            text: wellboreHeader.depth_reference_point,
                            lineType: "dashed",
                            color: "black",
                            depth: tvdStart,
                        },
                        {
                            text: wellboreHeader.depth_reference_datum,
                            lineType: wellboreHeader.depth_reference_datum === "MSL" ? "wavy" : "solid",
                            color: wellboreHeader.depth_reference_datum === "MSL" ? "blue" : "brown",
                            depth: tvdStart + wellboreHeader.depth_reference_elevation,
                        },
                    ],
                },
            });
        }
    }

    if (wellboreCompletionsQuery.data) {
        const internalLayerIds: InternalLayerOptions = {
            holeLayerId: "hole-id",
            casingLayerId: "casing-id",
            completionLayerId: "completion-id",
            cementLayerId: "cement-id",
            pAndALayerId: "pAndA-id",
            perforationLayerId: "perforation-id",
        };

        layers.push({
            id: "schematic",
            type: LayerType.SCHEMATIC,
            hoverable: true,
            options: {
                order: 5,
                data: makeSchematicsFromWellCompletions(wellboreCompletionsQuery.data),
                referenceSystem: ris,
                internalLayerOptions: internalLayerIds,
            },
        });
    }

    if (wellborePicksAndStratigraphicUnitsQuery.data) {
        const { wellborePicks, stratigraphicUnits } = createEsvWellborePicksAndStratigraphicUnits(
            wellborePicksAndStratigraphicUnitsQuery.data
        );
        const picksData = transformFormationData(wellborePicks, stratigraphicUnits);
        layers.push({
            id: "callout",
            type: LayerType.CALLOUT_CANVAS,
            hoverable: true,
            options: {
                order: 100,
                data: getPicksData(picksData),
                referenceSystem: ris,
                minFontSize: 12,
                maxFontSize: 16,
            },
        });
    }

    if (
        generatedSeismicSliceImageData &&
        generatedSeismicSliceImageData.status === "success" &&
        generatedSeismicSliceImageData.image &&
        generatedSeismicSliceImageData.synchedOptions
    ) {
        const info = getSeismicInfo(
            {
                datapoints: generatedSeismicSliceImageData.synchedOptions.dataValues,
                yAxisValues: generatedSeismicSliceImageData.synchedOptions.yAxisValues,
            },
            generatedSeismicSliceImageData.synchedOptions.trajectoryXyPoints
        );
        if (info) {
            // Adjust x axis offset to account for curtain
            info.minX = info.minX - 0;
            info.maxX = info.maxX - 0;
        }
        layers.push({
            id: "seismic",
            type: LayerType.SEISMIC_CANVAS,
            hoverable: true,
            options: {
                data: { image: generatedSeismicSliceImageData.image, options: getSeismicOptions(info) },
            },
        });
    }

    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            <EsvIntersection
                showGrid={visibleLayers.includes("grid")}
                showAxes
                showAxesLabels={visibleLayers.includes("axis-labels")}
                axesOptions={{
                    xLabel: "X",
                    yLabel: "Y",
                    unitOfMeasure: "m",
                }}
                layers={layers.filter((layer) => {
                    return (
                        (layer.id === "wellborepath" && visibleLayers.includes("wellborepath")) ||
                        (layer.id === "geomodel" && visibleLayers.includes("geomodel")) ||
                        (layer.id === "geomodel-labels" && visibleLayers.includes("geomodel-labels")) ||
                        (layer.id === "seismic" && visibleLayers.includes("seismic")) ||
                        (layer.id === "schematic" && visibleLayers.includes("schematic")) ||
                        (layer.id === "sea-and-rkb" && visibleLayers.includes("sea-and-rkb")) ||
                        (layer.id === "callout" && visibleLayers.includes("picks")) ||
                        (layer.id === "polyline-intersection" && visibleLayers.includes("polyline-intersection"))
                    );
                })}
                intersectionReferenceSystem={ris ?? undefined}
                bounds={{
                    x: [10, 1000],
                    y: [0, 3000],
                }}
                viewport={[1000, 1650, 6000]}
            />
        </div>
    );
};

View.displayName = "View";

function makeSchematicsFromWellCompletions(completions: WellBoreCompletion_api[]): SchematicData {
    const perforations: Perforation[] = [];
    for (const [index, completion] of completions.entries()) {
        if (completion.completion_type === "perforation") {
            perforations.push({
                kind: "perforation",
                subKind: "Perforation",
                id: `perforation-${index}`,
                start: completion.top_depth_md,
                end: completion.base_depth_md,
                isOpen: completion.completion_open_flag,
            });
        }
    }

    return {
        holeSizes: [{ kind: "hole", id: "hole-01", start: 0, end: Infinity, diameter: 5 }],
        cements: [],
        casings: [],
        completion: [],
        pAndA: [],
        perforations,
        symbols: {},
    };
}
