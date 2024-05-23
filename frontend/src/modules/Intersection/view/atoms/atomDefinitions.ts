import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleAtoms } from "@framework/Module";
import { UniDirectionalSettingsToViewInterface } from "@framework/UniDirectionalSettingsToViewInterface";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { BaseLayer } from "@modules/Intersection/utils/layers/BaseLayer";
import { isGridLayer } from "@modules/Intersection/utils/layers/GridLayer";
import { isSeismicLayer } from "@modules/Intersection/utils/layers/SeismicLayer";
import { isSurfaceLayer } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { atom } from "jotai";

import { wellboreTrajectoryQueryAtom } from "./queryAtoms";

export type ViewAtoms = {
    layers: BaseLayer<any, any>[];
    //seismicFenceDataQueryAtom: QueryObserverResult<SeismicFenceData_trans>;
    intersectionReferenceSystemAtom: IntersectionReferenceSystem | null;
    //seismicSliceImageOptionsAtom: SeismicSliceImageOptions | null;
    polylineAtom: number[];
    //polylineIntersectionQueriesAtom: CombinedPolylineIntersectionResults;
};

export function viewAtomsInitialization(
    settingsToViewInterface: UniDirectionalSettingsToViewInterface<SettingsToViewInterface>
): ModuleAtoms<ViewAtoms> {
    const selectedCustomIntersectionPolylineAtom = atom((get) => {
        const customIntersectionPolylineId = get(
            settingsToViewInterface.getAtom("selectedCustomIntersectionPolylineId")
        );
        const customIntersectionPolylines = get(IntersectionPolylinesAtom);

        return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
    });

    const intersectionReferenceSystemAtom = atom((get) => {
        const wellboreTrajectoryQuery = get(wellboreTrajectoryQueryAtom);
        const customIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));

        if (intersectionType === IntersectionType.WELLBORE) {
            if (!wellboreTrajectoryQuery.data) {
                return null;
            }

            const wellboreTrajectory = wellboreTrajectoryQuery.data;

            if (wellboreTrajectoryQuery) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northing_arr.entries()) {
                    const easting = wellboreTrajectory.easting_arr[index];
                    const tvd_msl = wellboreTrajectory.tvd_msl_arr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.tvd_msl_arr[0];

                const referenceSystem = new IntersectionReferenceSystem(path);
                referenceSystem.offset = offset;

                return referenceSystem;
            }
        } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
            if (customIntersectionPolyline.points.length < 2) {
                return null;
            }
            const referenceSystem = new IntersectionReferenceSystem(
                customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
            );
            referenceSystem.offset = 0;

            return referenceSystem;
        }

        return null;
    });

    const polylineAtom = atom((get) => {
        const intersectionType = get(settingsToViewInterface.getAtom("intersectionType"));
        const intersectionExtensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));
        const curveFittingEpsilon = get(settingsToViewInterface.getAtom("curveFittingEpsilon"));
        const selectedCustomIntersectionPolyline = get(selectedCustomIntersectionPolylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);

        const polylineUtmXy: number[] = [];

        if (intersectionReferenceSystem) {
            if (intersectionType === IntersectionType.WELLBORE) {
                const path = intersectionReferenceSystem.path;
                polylineUtmXy.push(
                    ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
                        path,
                        intersectionExtensionLength,
                        curveFittingEpsilon
                    ).flat()
                );
            } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && selectedCustomIntersectionPolyline) {
                for (const point of selectedCustomIntersectionPolyline.points) {
                    polylineUtmXy.push(point[0], point[1]);
                }
            }
        }

        return polylineUtmXy;
    });

    const layers = atom((get) => {
        const layers = get(settingsToViewInterface.getAtom("layers"));
        const polyline = get(polylineAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);
        const extensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));

        for (const layer of layers) {
            if (isGridLayer(layer)) {
                layer.maybeUpdateSettings({ polylineXyz: polyline });
            }
            if (isSeismicLayer(layer)) {
                layer.maybeUpdateSettings({ intersectionReferenceSystem, extensionLength });
            }
            if (isSurfaceLayer(layer)) {
                layer.maybeUpdateSettings({ intersectionReferenceSystem, extensionLength });
            }
        }

        return layers;
    });

    /*
    const polylineIntersectionQueriesAtom = atomWithQueries((get) => {
        const layers = get(settingsToViewInterface.getAtom("layers"));
        const polyline = get(polylineAtom);
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
        const realizationNum = get(settingsToViewInterface.getAtom("realization"));

        const gridLayers = layers.filter((layer) => layer.type === LayerType.GRID) as GridLayer[];

        const queries = gridLayers
            .map((el) => {
                return () => ({
                    queryKey: [
                        "postGetIntersection",
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        realizationNum,
                        el.settings.modelName,
                        el.settings.parameterName,
                        el.settings.parameterDateOrInterval,
                        polyline,
                    ],
                    queryFn: () =>
                        apiService.grid3D.postGetPolylineIntersection(
                            ensembleIdent?.getCaseUuid() ?? "",
                            ensembleIdent?.getEnsembleName() ?? "",
                            el.settings.modelName ?? "",
                            el.settings.parameterName ?? "",
                            realizationNum ?? 0,
                            { polyline_utm_xy: polyline },
                            el.settings.parameterDateOrInterval ?? undefined
                        ),
                    select: transformPolylineIntersection,
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                    enabled: !!(
                        ensembleIdent &&
                        realizationNum !== null &&
                        polyline.length > 0 &&
                        el.settings.modelName &&
                        el.settings.parameterName
                    ),
                });
            })
            .flat();

        function combine(
            results: UseQueryResult<PolylineIntersection_trans, Error>[]
        ): CombinedPolylineIntersectionResults {
            return {
                combinedPolylineIntersectionResults: results.map((el, idx) => {
                    return {
                        id: gridLayers[idx].id,
                        polylineIntersection: el.data,
                    };
                }),
                isFetching: results.some((result) => result.isFetching),
                someQueriesFailed: results.some((result) => result.isError),
                allQueriesFailed: results.every((result) => result.isError),
            };
        }

        return {
            queries,
            combine,
        };
    });

    const seismicFenceDataQueryAtom = atomWithQuery((get) => {
        const ensembleIdent = get(settingsToViewInterface.getAtom("ensembleIdent"));
        const realizationNum = get(settingsToViewInterface.getAtom("realization"));
        const seismicAttribute = get(settingsToViewInterface.getAtom("seismicAttribute"));
        const timeOrIntervalStr = get(settingsToViewInterface.getAtom("seismicDateOrIntervalString"));
        const observed = get(settingsToViewInterface.getAtom("seismicDataType")) === SeismicDataType.OBSERVED;
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);
        const extensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));

        const polyline =
            intersectionReferenceSystem?.getExtendedTrajectory(1000, extensionLength, extensionLength).points ?? [];

        const caseUuid = ensembleIdent?.getCaseUuid();
        const ensembleName = ensembleIdent?.getEnsembleName();

        const xPoints: number[] = [];
        const yPoints: number[] = [];
        for (let i = 0; i < polyline.length; i++) {
            xPoints.push(polyline[i][0]);
            yPoints.push(polyline[i][1]);
        }

        return {
            queryKey: [
                "postGetSeismicFence",
                caseUuid,
                ensembleName,
                realizationNum,
                seismicAttribute,
                timeOrIntervalStr,
                observed,
                polyline,
            ],
            queryFn: () =>
                apiService.seismic.postGetSeismicFence(
                    caseUuid ?? "",
                    ensembleName ?? "",
                    realizationNum ?? 0,
                    seismicAttribute ?? "",
                    timeOrIntervalStr ?? "",
                    observed ?? false,
                    { polyline: { x_points: xPoints, y_points: yPoints } }
                ),
            select: transformSeismicFenceData,
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
            enabled: !!(
                caseUuid &&
                ensembleName &&
                realizationNum !== null &&
                seismicAttribute &&
                timeOrIntervalStr &&
                observed !== null &&
                polyline !== null
            ),
        };
    });

    const seismicSliceImageOptionsAtom = atom((get) => {
        const seismicFenceDataQuery = get(seismicFenceDataQueryAtom);
        const intersectionReferenceSystem = get(intersectionReferenceSystemAtom);
        const seismicColorScale = get(settingsToViewInterface.getAtom("seismicColorScale"));
        const intersectionExtensionLength = get(settingsToViewInterface.getAtom("intersectionExtensionLength"));

        if (!seismicFenceDataQuery.data || !intersectionReferenceSystem || !seismicColorScale) {
            return null;
        }

        const datapoints = createSeismicSliceImageDatapointsArrayFromFenceData(seismicFenceDataQuery.data);
        const yAxisValues = createSeismicSliceImageYAxisValuesArrayFromFenceData(seismicFenceDataQuery.data);
        const trajectory = intersectionReferenceSystem.getExtendedTrajectory(
            seismicFenceDataQuery.data.num_traces,
            intersectionExtensionLength,
            intersectionExtensionLength
        );
        const trajectoryXyProjection = IntersectionReferenceSystem.toDisplacement(trajectory.points, trajectory.offset);

        console.debug(trajectoryXyProjection[0], trajectoryXyProjection[trajectoryXyProjection.length - 1]);

        const sliceImageOptions: SeismicSliceImageOptions = {
            datapoints,
            yAxisValues,
            trajectory: trajectoryXyProjection,
            colorScale: seismicColorScale,
        };

        return sliceImageOptions;
    });
    */

    return {
        layers,
        //seismicFenceDataQueryAtom,
        intersectionReferenceSystemAtom,
        //seismicSliceImageOptionsAtom,
        polylineAtom,
        //polylineIntersectionQueriesAtom,
    };
}
