import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useIntersectionPolylines } from "@framework/UserCreatedItems";
import { IntersectionPolyline, IntersectionPolylineWithoutId } from "@framework/userCreatedItems/IntersectionPolylines";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersectionReadoutEvent } from "@modules/_shared/components/EsvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { AxesLayer, NorthArrow3DLayer } from "@webviz/subsurface-viewer/dist/layers";

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
import { IntersectionType } from "../typesAndEnums";

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
    const wellboreUuid = useAtomValue(selectedWellboreUuidAtom);
    const showGridLines = props.viewContext.useSettingsToViewInterfaceValue("showGridlines");
    const gridLayer = props.viewContext.useSettingsToViewInterfaceValue("gridLayer");
    const zFactor = props.viewContext.useSettingsToViewInterfaceValue("zFactor");
    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const addPolylineModeActive = useAtomValue(addCustomIntersectionPolylineEditModeActiveAtom);
    const [editPolylineModeActive, setEditPolylineModeActive] = useAtom(
        editCustomIntersectionPolylineEditModeActiveAtom
    );
    const intersectionType = useAtomValue(intersectionTypeAtom);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [hoveredMd3dGrid, setHoveredMd3dGrid] = React.useState<number | null>(null);
    const selectedCustomIntersectionPolylineId = useAtomValue(userSelectedCustomIntersectionPolylineIdAtom);

    const fieldWellboreTrajectoriesQuery = useFieldWellboreTrajectoriesQuery(ensembleIdent?.getCaseUuid() ?? undefined);

    if (fieldWellboreTrajectoriesQuery.isError) {
        statusWriter.addError(fieldWellboreTrajectoriesQuery.error.message);
    }

    const polylineUtmXy: number[] = [];
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

                const extendedTrajectory = intersectionReferenceSystem.getExtendedTrajectory(
                    10,
                    intersectionExtensionLength,
                    intersectionExtensionLength
                );

                for (const point of extendedTrajectory.points) {
                    polylineUtmXy.push(point[0], point[1]);
                }
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
        gridLayer
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
        gridLayer
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
        intersectionPolylines.add(polyline);
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

    if (gridSurfaceQuery.data && gridParameterQuery.data) {
        const minPropValue = gridParameterQuery.data.min_grid_prop_value;
        const maxPropValue = gridParameterQuery.data.max_grid_prop_value;
        layers.push(
            makeGrid3DLayer(gridSurfaceQuery.data, gridParameterQuery.data, showGridLines, [minPropValue, maxPropValue])
        );

        if (polylineIntersectionQuery.data) {
            layers.push(
                makeIntersectionLayer(polylineIntersectionQuery.data, showGridLines, [minPropValue, maxPropValue])
            );
        }
    }

    if (fieldWellboreTrajectoriesQuery.data) {
        layers.push(makeWellsLayer(fieldWellboreTrajectoriesQuery.data, wellboreUuid));
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
            />
        </div>
    );
}
