import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { GeoJsonLayer } from "@deck.gl/layers/typed";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolyline, IntersectionPolylineWithoutId } from "@framework/userCreatedItems/IntersectionPolylines";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersectionReadoutEvent } from "@modules/_shared/components/EsvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";
import { AxesLayer, NorthArrow3DLayer, PolylinesLayer } from "@webviz/subsurface-viewer/dist/layers";

import { FeatureCollection } from "geojson";
import { useAtom, useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom, selectedCustomIntersectionPolylineAtom } from "./atoms/derivedAtoms";
import { SubsurfaceViewerWrapper } from "./components/SubsurfaceViewerWrapper";
import { useGridParameterQuery, useGridSurfaceQuery } from "./queries/gridQueries";
import { useGridPolylineIntersection as useGridPolylineIntersectionQuery } from "./queries/polylineIntersection";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";
import { createContinuousColorScaleForMap } from "./utils/colorTables";
import { makeAxesLayer, makeGrid3DLayer, makeIntersectionLayer, makeWellsLayer } from "./utils/layers";

import { userSelectedCustomIntersectionPolylineIdAtom } from "../settings/atoms/baseAtoms";
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

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const ensembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const intersectionPolylines = useIntersectionPolylines(props.workbenchSession);

    const realization = props.viewContext.useSettingsToViewInterfaceValue("realization");
    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelBoundingBox3d = props.viewContext.useSettingsToViewInterfaceValue("gridModelBoundingBox3d");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );
    const gridCellIndexRanges = props.viewContext.useSettingsToViewInterfaceValue("gridCellIndexRanges");
    const wellboreUuid = useAtomValue(selectedWellboreUuidAtom);
    const showGridLines = props.viewContext.useSettingsToViewInterfaceValue("showGridlines");
    const gridLayer = props.viewContext.useSettingsToViewInterfaceValue("gridLayer");
    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const addPolylineModeActive = useAtomValue(addCustomIntersectionPolylineEditModeActiveAtom);
    const [editPolylineModeActive, setEditPolylineModeActive] = useAtom(
        editCustomIntersectionPolylineEditModeActiveAtom
    );
    const [intersectionType, setIntersectionType] = useAtom(intersectionTypeAtom);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [hoveredMd3dGrid, setHoveredMd3dGrid] = React.useState<number | null>(null);
    const [selectedCustomIntersectionPolylineId, setSelectedCustomIntersectionPolylineId] = useAtom(
        userSelectedCustomIntersectionPolylineIdAtom
    );

    const fieldWellboreTrajectoriesQuery = useFieldWellboreTrajectoriesQuery(ensembleIdent?.getCaseUuid() ?? undefined);

    if (fieldWellboreTrajectoriesQuery.isError) {
        statusWriter.addError(fieldWellboreTrajectoriesQuery.error.message);
    }

    const polylineUtmXy: number[] = [];
    const oldPolylineUtmXy: number[] = [];
    let hoveredMdPoint3d: number[] | null = null;

    let intersectionReferenceSystem: IntersectionReferenceSystem | null = null;
    const customIntersectionPolyline = intersectionPolylines.getPolyline(selectedCustomIntersectionPolylineId ?? "");

    if (intersectionType === IntersectionType.WELLBORE) {
        if (fieldWellboreTrajectoriesQuery.data && wellboreUuid) {
            const wellboreTrajectory = fieldWellboreTrajectoriesQuery.data.find(
                (wellbore) => wellbore.wellbore_uuid === wellboreUuid
            );
            if (wellboreTrajectory) {
                const path: number[][] = [];
                for (const [index, northing] of wellboreTrajectory.northing_arr.entries()) {
                    const easting = wellboreTrajectory.easting_arr[index];
                    const tvd_msl = wellboreTrajectory.tvd_msl_arr[index];

                    path.push([easting, northing, tvd_msl]);
                }
                const offset = wellboreTrajectory.tvd_msl_arr[0];

                intersectionReferenceSystem = new IntersectionReferenceSystem(path);
                intersectionReferenceSystem.offset = offset;

                polylineUtmXy.push(
                    ...calcExtendedSimplifiedWellboreTrajectoryInXYPlane(path, intersectionExtensionLength, 5).flat()
                );

                const extendedTrajectory = intersectionReferenceSystem.getExtendedTrajectory(
                    100,
                    intersectionExtensionLength,
                    intersectionExtensionLength
                );

                oldPolylineUtmXy.push(...extendedTrajectory.points.flat());
            }
        }
    } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE) {
        if (customIntersectionPolyline && customIntersectionPolyline.points.length >= 2) {
            intersectionReferenceSystem = new IntersectionReferenceSystem(
                customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
            );
            intersectionReferenceSystem.offset = 0;
            if (!customIntersectionPolyline) {
                statusWriter.addError("Custom intersection polyline not found");
            } else {
                for (const point of customIntersectionPolyline.points) {
                    polylineUtmXy.push(point[0], point[1]);
                }
            }
        }
    }

    if (hoveredMd && intersectionReferenceSystem) {
        const [x, y] = intersectionReferenceSystem.getPosition(hoveredMd);
        const [, z] = intersectionReferenceSystem.project(hoveredMd);
        hoveredMdPoint3d = [x, y, z];
    }

    // Polyline intersection query
    const polylineIntersectionQuery = useGridPolylineIntersectionQuery(
        ensembleIdent ?? null,
        gridModelName,
        gridModelParameterName,
        gridModelParameterDateOrInterval,
        realization,
        polylineUtmXy
    );
    if (polylineIntersectionQuery.isError) {
        statusWriter.addError(polylineIntersectionQuery.error.message);
    }

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingQuery(wellboreUuid ?? undefined);
    if (wellboreCasingQuery.isError) {
        statusWriter.addError(wellboreCasingQuery.error.message);
    }

    // Grid surface query
    const gridSurfaceQuery = useGridSurfaceQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        gridModelName,
        realization,
        gridCellIndexRanges.i[0],
        gridCellIndexRanges.i[1],
        gridCellIndexRanges.j[0],
        gridCellIndexRanges.j[1],
        gridCellIndexRanges.k[0],
        gridCellIndexRanges.k[1]
    );
    if (gridSurfaceQuery.isError) {
        statusWriter.addError(gridSurfaceQuery.error.message);
    }

    // Grid parameter query
    const gridParameterQuery = useGridParameterQuery(
        ensembleIdent?.getCaseUuid() ?? null,
        ensembleIdent?.getEnsembleName() ?? null,
        gridModelName,
        gridModelParameterName,
        gridModelParameterDateOrInterval,
        realization,
        gridCellIndexRanges.i[0],
        gridCellIndexRanges.i[1],
        gridCellIndexRanges.j[0],
        gridCellIndexRanges.j[1],
        gridCellIndexRanges.k[0],
        gridCellIndexRanges.k[1]
    );
    if (gridParameterQuery.isError) {
        statusWriter.addError(gridParameterQuery.error.message);
    }

    // Set loading status
    statusWriter.setLoading(
        polylineIntersectionQuery.isFetching ||
            fieldWellboreTrajectoriesQuery.isFetching ||
            wellboreCasingQuery.isFetching ||
            gridSurfaceQuery.isFetching ||
            gridParameterQuery.isFetching
    );

    const handleReadout = React.useCallback(function handleReadout(event: EsvIntersectionReadoutEvent) {
        const items = event.readoutItems;
        const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
        if (!wellboreReadoutItem) {
            setHoveredMd(null);
            return;
        }
        const md = wellboreReadoutItem.md;
        if (!md) {
            setHoveredMd(null);
            return;
        }
        setHoveredMd(md);
    }, []);

    const handleGrid3DMdChange = React.useCallback(function handleGrid3DMdChange(md: number | null) {
        setHoveredMd3dGrid(md);
    }, []);

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    function handleAddPolyline(polyline: IntersectionPolylineWithoutId) {
        const id = intersectionPolylines.add(polyline);
        setSelectedCustomIntersectionPolylineId(id);
        setIntersectionType(IntersectionType.CUSTOM_POLYLINE);
    }

    function handlePolylineChange(polyline: IntersectionPolyline) {
        const { id, ...rest } = polyline;
        intersectionPolylines.updatePolyline(id, rest);
        setEditPolylineModeActive(false);
    }

    function handleEditPolylineCancel() {
        setEditPolylineModeActive(false);
    }

    if (!gridModelBoundingBox3d) {
        return null;
    }

    const colorTables = createContinuousColorScaleForMap(colorScale);

    const northArrowLayer = new NorthArrow3DLayer({
        id: "north-arrow-layer",
        visible: true,
    });

    const axesLayer = makeAxesLayer(gridModelBoundingBox3d);

    const layers: Layer[] = [northArrowLayer, axesLayer];

    if (polylineUtmXy) {
        const polyLineLayer = new GeoJsonLayer({
            id: "polyline-layer",
            data: polyLineToGeojsonLineString(polylineUtmXy, oldPolylineUtmXy),
            pickable: true,
            stroked: false,
            getLineColor: (d: any) => d.properties.color,
            getPointRadius: (d: any) => d.properties.size,
            getFillColor: (d: any) => d.properties.color,
            filled: true,
            lineWidthScale: 2,
            lineWidthMinPixels: 2,
        });
        layers.push(polyLineLayer);
    }

    if (gridSurfaceQuery.data && gridParameterQuery.data) {
        const minPropValue = gridParameterQuery.data.min_grid_prop_value;
        const maxPropValue = gridParameterQuery.data.max_grid_prop_value;
        colorScale.setRange(minPropValue, maxPropValue);
        layers.push(makeGrid3DLayer(gridSurfaceQuery.data, gridParameterQuery.data, showGridLines, colorScale));

        if (polylineIntersectionQuery.data) {
            layers.push(
                makeIntersectionLayer(polylineIntersectionQuery.data, showGridLines, [minPropValue, maxPropValue])
            );
        }
    }

    if (fieldWellboreTrajectoriesQuery.data) {
        const maybeWellboreUuid = intersectionType === IntersectionType.WELLBORE ? wellboreUuid : null;
        layers.push(makeWellsLayer(fieldWellboreTrajectoriesQuery.data, maybeWellboreUuid));
    }

    return (
        <div className="w-full h-full">
            <SubsurfaceViewerWrapper
                boundingBox={gridModelBoundingBox3d ?? undefined}
                colorTables={colorTables}
                layers={layers}
                show3D
                enableIntersectionPolylineEditing
                onAddIntersectionPolyline={handleAddPolyline}
                intersectionPolyline={editPolylineModeActive ? customIntersectionPolyline : undefined}
                onIntersectionPolylineChange={handlePolylineChange}
                onIntersectionPolylineEditCancel={handleEditPolylineCancel}
            />
        </div>
    );
}

function polyLineToGeojsonLineString(polyLine1: number[], polyLine2: number[]): FeatureCollection {
    // Expect an array with even numbers of elements.
    // Each pair of elements is a coordinate.
    const coordinates1 = [];
    for (let i = 0; i < polyLine1.length; i += 2) {
        coordinates1.push([polyLine1[i], polyLine1[i + 1], 0]);
    }
    const coordinates2 = [];
    for (let i = 0; i < polyLine2.length; i += 2) {
        coordinates2.push([polyLine2[i], polyLine2[i + 1], -100]);
    }

    const featureCollection: FeatureCollection = {
        type: "FeatureCollection",
        features: [
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coordinates1,
                },
                properties: {
                    color: [0, 255, 0, 100], // Custom property to use in styling (optional)
                },
            },
            {
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: coordinates2,
                },
                properties: {
                    color: [255, 0, 0, 100], // Custom property to use in styling (optional)
                },
            },
        ],
    };

    coordinates1.forEach((coord) => {
        featureCollection.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: coord,
            },
            properties: {
                color: [0, 255, 0], // Custom property to use in styling (optional)
                size: 10,
            },
        });
    });

    coordinates2.forEach((coord) => {
        featureCollection.features.push({
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: coord,
            },
            properties: {
                color: [255, 0, 0], // Custom property to use in styling (optional)
                size: 10,
            },
        });
    });

    return featureCollection;
}
