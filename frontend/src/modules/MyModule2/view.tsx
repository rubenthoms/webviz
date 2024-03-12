import React from "react";

import {
    InternalLayerOptions,
    IntersectionReferenceSystem,
    Perforation,
    ReferenceLine,
    SchematicData,
    SchematicLayerOptions,
    SurfaceData,
    generateSeismicSliceImage,
    generateSurfaceData,
    getPicksData,
    getSeismicInfo,
    getSeismicOptions,
    transformFormationData,
} from "@equinor/esv-intersection";
import { ModuleFCProps } from "@framework/Module";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { EsvIntersection } from "@modules/_shared/components/EsvIntersection";
import { LayerItem, LayerType } from "@modules/_shared/components/EsvIntersection/esvIntersection";

import {
    getCasings,
    getCement,
    getCementSqueezes,
    getCompletion,
    getHolesize,
    getPicks,
    getPolyLineIntersection,
    getSeismic,
    getStratColumns,
    getSurfaces,
    getWellborePath,
} from "./data/data";
import seismicColorMap from "./data/seismic-colormap.json";
import { State } from "./state";

export const View = (props: ModuleFCProps<State>) => {
    const grid = props.moduleContext.useStoreValue("grid");
    const wellbore = props.moduleContext.useStoreValue("wellbore");
    const geoModel = props.moduleContext.useStoreValue("geoModel");
    const geoModelLabels = props.moduleContext.useStoreValue("geoModelLabels");
    const seismic = props.moduleContext.useStoreValue("seismic");
    const schematic = props.moduleContext.useStoreValue("schematic");
    const seaAndRbk = props.moduleContext.useStoreValue("seaAndRbk");
    const picks = props.moduleContext.useStoreValue("picks");
    const axisLabels = props.moduleContext.useStoreValue("axisLabels");
    const polyLineIntersection = props.moduleContext.useStoreValue("polyLineIntersection");

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const [layers, setLayers] = React.useState<LayerItem<any>[]>([]);
    const [ris, setRis] = React.useState<IntersectionReferenceSystem | null>(null);

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

    return (
        <div className="h-full w-full flex flex-col justify-center items-center">
            <EsvIntersection
                showGrid={grid}
                showAxes
                showAxesLabels={axisLabels}
                axesOptions={{
                    xLabel: "X",
                    yLabel: "Y",
                    unitOfMeasure: "m",
                }}
                layers={layers.filter((layer) => {
                    return (
                        (layer.id === "wellborepath" && wellbore) ||
                        (layer.id === "geomodel" && geoModel) ||
                        (layer.id === "geomodellabels" && geoModelLabels) ||
                        (layer.id === "seismic" && seismic) ||
                        (layer.id === "schematic" && schematic) ||
                        (layer.id === "seaAndRbk" && seaAndRbk) ||
                        (layer.id === "callout" && picks) ||
                        (layer.id === "polyline-intersection" && polyLineIntersection)
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
