import React from "react";

import { WellBoreCompletion_api } from "@api";
import {
    InternalLayerOptions,
    IntersectionReferenceSystem,
    Perforation,
    SchematicData,
    SurfaceLine,
    getPicksData,
    transformFormationData,
} from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
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
import { State } from "./state";

export const View = (props: ModuleFCProps<State>) => {
    const statusWriter = useViewStatusWriter(props.moduleContext);

    const ensembleIdent = props.moduleContext.useStoreValue("ensembleIdent");
    const realizations = props.moduleContext.useStoreValue("realizations");
    const wellboreHeader = props.moduleContext.useStoreValue("wellboreHeader");
    const surfaceAttribute = props.moduleContext.useStoreValue("surfaceAttribute");
    const surfaceNames = props.moduleContext.useStoreValue("surfaceNames");
    const stratigraphyColorMap = props.moduleContext.useStoreValue("stratigraphyColorMap");

    const visibleLayers = props.moduleContext.useStoreValue("visibleLayers");
    const visibleStatisticCurves = props.moduleContext.useStoreValue("visibleStatisticCurves");

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

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

    /*
    React.useEffect(() => {
        const promises = [
            getWellborePath(),
            getCompletion(),
            getSeismic(),
            getSurfaces(),
            getStratColumns(),
            getCasings(),
            getHolesize(),
            getCement(),
            getPicks(),
            getCementSqueezes(),
            getPolyLineIntersection(),
        ];
        Promise.all(promises).then((values) => {
            const [
                path,
                completion,
                seismic,
                surfaces,
                stratColumns,
                casings,
                holeSizes,
                cement,
                picks,
                cementSqueezes,
                polylineIntersection,
            ] = values;

            const referenceSystem = new IntersectionReferenceSystem(path);
            referenceSystem.offset = path[0][2]; // Offset should be md at start of path
            setRis(referenceSystem);
            const displacement = referenceSystem.displacement || 1;
            const extend = 1000 / displacement;
            const steps = surfaces[0]?.data?.values?.length || 1;
            const traj = referenceSystem.getTrajectory(steps, 0, 1 + extend);
            const trajectory: number[][] = IntersectionReferenceSystem.toDisplacement(traj.points, traj.offset);
            const geolayerdata: SurfaceData = generateSurfaceData(trajectory, stratColumns, surfaces);
            const seismicInfo = getSeismicInfo(seismic, trajectory);

            const transformedPicksData = transformFormationData(picks, stratColumns);
            const picksData = getPicksData(transformedPicksData);

            const seismicOptions = getSeismicOptions(seismicInfo);

            generateSeismicSliceImage(seismic as any, trajectory, seismicColorMap).then(
                (seismicImage: ImageBitmap | undefined) => {
                    const newLayers: LayerItem<any>[] = [];

                    const CSDSVGs = {
                        completionSymbol1:
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMCAwSDkwVjEwMEgxMFYwWiIgZmlsbD0iI0Q5RDlEOSIvPgo8cGF0aCBkPSJNMCAyNUgxMFY3NUgwVjI1WiIgZmlsbD0iI0I1QjJCMiIvPgo8cGF0aCBkPSJNNDUgMjVINTVWNzVINDVWMjVaIiBmaWxsPSIjQjVCMkIyIi8+CjxwYXRoIGQ9Ik05MCAyNUgxMDBWNzVIOTBWMjVaIiBmaWxsPSIjQjVCMkIyIi8+Cjwvc3ZnPgo=",
                        completionSymbol2: "tubing1.svg", // Fetched from URL. Full URL with protocol and hostname is allowed.
                        completionSymbol3:
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xMCAwSDkwVjEwMEgxMFYwWiIgZmlsbD0iI0Q5RDlEOSIvPgo8cGF0aCBkPSJNMCAyNUgxMFY3NUgwVjI1WiIgZmlsbD0iI0I1QjJCMiIvPgo8cGF0aCBkPSJNNDUgMjVINTVWNzVINDVWMjVaIiBmaWxsPSIjQjVCMkIyIi8+CjxwYXRoIGQ9Ik0yNSA2NUgzMFY4MEgyNVY2NVoiIGZpbGw9IiMzMTMxMzEiLz4KPHBhdGggZD0iTTI1IDQySDMwVjU3SDI1VjQyWiIgZmlsbD0iIzMxMzEzMSIvPgo8cGF0aCBkPSJNMjUgMjFIMzBWMzZIMjVWMjFaIiBmaWxsPSIjMzEzMTMxIi8+CjxwYXRoIGQ9Ik03MCA2NEg3NVY3OUg3MFY2NFoiIGZpbGw9IiMzMTMxMzEiLz4KPHBhdGggZD0iTTcwIDQxSDc1VjU2SDcwVjQxWiIgZmlsbD0iIzMxMzEzMSIvPgo8cGF0aCBkPSJNNzAgMjBINzVWMzVINzBWMjBaIiBmaWxsPSIjMzEzMTMxIi8+CjxwYXRoIGQ9Ik05MCAyNUgxMDBWNzVIOTBWMjVaIiBmaWxsPSIjQjVCMkIyIi8+Cjwvc3ZnPgo=",
                    };

                    const completionSymbols = [
                        {
                            kind: "completionSymbol",
                            id: "completion-svg-1",
                            start: 5250,
                            end: 5252,
                            diameter: 8.5,
                            symbolKey: "completionSymbol1",
                        },
                        {
                            kind: "completionSymbol",
                            id: "completion-svg-2",
                            start: 5252,
                            end: 5274,
                            diameter: 8.5,
                            symbolKey: "completionSymbol2",
                        },
                        {
                            kind: "completionSymbol",
                            id: "completion-svg-3",
                            start: 5274,
                            end: 5276,
                            diameter: 8.5,
                            symbolKey: "completionSymbol3",
                        },
                    ];

                    const pAndASVGs = {
                        mechanicalPlug:
                            "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+Cjxzdmcgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxMDAiIHZpZXdCb3g9IjAgMCAxMDAgMTAwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cGF0aCBkPSJNMSAxSDk5Vjk5SDFWMVoiIGZpbGw9InVybCgjcGFpbnQwX2xpbmVhcl81MF81KSIvPgo8cGF0aCBkPSJNMSAxSDk5Vjk5SDFWMVoiIGZpbGw9InVybCgjcGFpbnQxX2xpbmVhcl81MF81KSIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KPHBhdGggZD0iTTEgMUg5OVY5OUgxVjFaIiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiLz4KPGxpbmUgeDE9IjEuNzEwNzIiIHkxPSIxLjI5NjUzIiB4Mj0iOTguNzEwNyIgeTI9Ijk5LjI5NjUiIHN0cm9rZT0iYmxhY2siIHN0cm9rZS13aWR0aD0iMiIvPgo8bGluZSB4MT0iOTguNzA3MSIgeTE9IjAuNzA3MTA3IiB4Mj0iMC43MDcxIiB5Mj0iOTguNzA3MSIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIi8+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9InBhaW50MF9saW5lYXJfNTBfNSIgeDE9IjAiIHkxPSI1MCIgeDI9IjUwIiB5Mj0iNTAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0NDMjYyNiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjQ3MUEiLz4KPC9saW5lYXJHcmFkaWVudD4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDFfbGluZWFyXzUwXzUiIHgxPSI1MCIgeTE9IjUwIiB4Mj0iMTAwIiB5Mj0iNTAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KPHN0b3Agc3RvcC1jb2xvcj0iI0ZGNDcxQSIvPgo8c3RvcCBvZmZzZXQ9IjAuOTk5OSIgc3RvcC1jb2xvcj0iI0NDMjYyNiIvPgo8c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNGRjQ3MUEiLz4KPC9saW5lYXJHcmFkaWVudD4KPC9kZWZzPgo8L3N2Zz4K",
                    };

                    const pAndASymbols = [
                        {
                            kind: "pAndASymbol" as const,
                            id: "mechanical-plug-1",
                            start: 5100,
                            end: 5110,
                            diameter: 8.5,
                            symbolKey: "mechanicalPlug",
                        },
                        {
                            kind: "cementPlug" as const,
                            id: "cement-plug-2",
                            start: 5000,
                            end: 5110,
                            referenceIds: ["casing-07"],
                        },
                    ];

                    const perforations: Perforation[] = [
                        {
                            kind: "perforation",
                            subKind: "Perforation",
                            id: "PerforationDemo1",
                            start: 4000,
                            end: 4500,
                            isOpen: true,
                        },
                        {
                            kind: "perforation",
                            subKind: "Cased hole frac pack",
                            id: "PerforationDemo2",
                            start: 3500,
                            end: 4500,
                            isOpen: true,
                        },
                    ];

                    const schematicData: SchematicData = {
                        holeSizes,
                        cements: cement,
                        casings,
                        completion: [...completion, ...completionSymbols],
                        pAndA: [...pAndASymbols, ...cementSqueezes],
                        perforations,
                        symbols: { ...CSDSVGs, ...pAndASVGs },
                    };

                    const internalLayerIds: InternalLayerOptions = {
                        holeLayerId: "hole-id",
                        casingLayerId: "casing-id",
                        completionLayerId: "completion-id",
                        cementLayerId: "cement-id",
                        pAndALayerId: "pAndA-id",
                        perforationLayerId: "perforation-id",
                    };

                    const schematicLayerOptions: SchematicLayerOptions<SchematicData> = {
                        order: 5,
                        referenceSystem,
                        internalLayerOptions: internalLayerIds,
                        data: schematicData,
                    };

                    const seaAndRKBLayerData: ReferenceLine[] = [
                        { text: "RKB", lineType: "dashed", color: "black", depth: 0 },
                        { text: "MSL", lineType: "wavy", color: "blue", depth: 30 },
                        { text: "Seabed", lineType: "solid", color: "slategray", depth: 91.1, lineWidth: 2 },
                    ];

                    newLayers.push(
                        {
                            id: "geomodel",
                            type: LayerType.GEOMODEL_V2,
                            options: {
                                order: 2,
                                layerOpacity: 0.6,
                                data: geolayerdata,
                            },
                        },
                        {
                            id: "wellborepath",
                            type: LayerType.WELLBORE_PATH,
                            options: {
                                order: 3,
                                stroke: "red",
                                strokeWidth: "2px",
                                referenceSystem: referenceSystem,
                            },
                        },
                        {
                            id: "geomodellabels",
                            type: LayerType.GEOMODEL_LABELS,
                            options: {
                                order: 3,
                                data: geolayerdata,
                            },
                        },
                        {
                            id: "seismic",
                            type: LayerType.SEISMIC_CANVAS,
                            options: {
                                order: 1,
                                data: {
                                    image: seismicImage,
                                    options: seismicOptions,
                                },
                            },
                        },
                        {
                            id: "schematic",
                            type: LayerType.SCHEMATIC,
                            options: schematicLayerOptions,
                        },
                        {
                            id: "seaAndRbk",
                            type: LayerType.REFERENCE_LINE,
                            options: {
                                data: seaAndRKBLayerData,
                            },
                        },
                        {
                            id: "callout",
                            type: LayerType.CALLOUT_CANVAS,
                            options: {
                                order: 100,
                                data: picksData,
                                referenceSystem,
                            },
                        },
                        {
                            id: "polyline-intersection",
                            type: LayerType.POLYLINE_INTERSECTION,
                            options: {
                                data: polylineIntersection,
                                colorScale,
                            },
                        }
                    );

                    setLayers(newLayers);
                }
            );
        });
    }, []);
    */

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
