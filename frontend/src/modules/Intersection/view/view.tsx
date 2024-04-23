import React from "react";

import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { IntersectionType } from "@framework/types/intersection";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersectionReadoutEvent } from "@modules/_shared/components/EsvIntersection";
import { ZoomTransform } from "@modules/_shared/components/EsvIntersection/esvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";
import { calcExtendedSimplifiedWellboreTrajectoryInXYPlane } from "@modules/_shared/utils/wellbore";

import { useAtom, useAtomValue } from "jotai";
import simplify from "simplify-js";

import { intersectionReferenceSystemAtom, selectedCustomIntersectionPolylineAtom } from "./atoms/derivedAtoms";
import { Intersection } from "./components/intersection";
import { useGridParameterQuery, useGridSurfaceQuery } from "./queries/gridQueries";
import { useGridPolylineIntersection as useGridPolylineIntersectionQuery } from "./queries/polylineIntersection";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import {
    addCustomIntersectionPolylineEditModeActiveAtom,
    currentCustomIntersectionPolylineAtom,
    editCustomIntersectionPolylineEditModeActiveAtom,
    intersectionTypeAtom,
    selectedEnsembleIdentAtom,
    selectedWellboreUuidAtom,
} from "../sharedAtoms/sharedAtoms";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const ensembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices);

    const syncedZoomTransform = syncHelper.useValue(
        SyncSettingKey.CAMERA_POSITION_INTERSECTION,
        "global.syncValue.cameraPositionIntersection"
    );

    const realization = props.viewContext.useSettingsToViewInterfaceValue("realization");
    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelBoundingBox3d = props.viewContext.useSettingsToViewInterfaceValue("gridModelBoundingBox3d");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );
    const wellboreUuid = useAtomValue(selectedWellboreUuidAtom);
    const showGridLines = props.viewContext.useSettingsToViewInterfaceValue("showGridlines");
    const zFactor = props.viewContext.useSettingsToViewInterfaceValue("zFactor");
    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const curveFittingEpsilon = props.viewContext.useSettingsToViewInterfaceValue("curveFittingEpsilon");
    const intersectionType = useAtomValue(intersectionTypeAtom);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [hoveredMd3dGrid, setHoveredMd3dGrid] = React.useState<number | null>(null);
    const selectedCustomIntersectionPolyline = useAtomValue(selectedCustomIntersectionPolylineAtom);

    const polylineUtmXy: number[] = [];
    let hoveredMdPoint3d: number[] | null = null;

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

        if (hoveredMd) {
            const [x, y] = intersectionReferenceSystem.getPosition(hoveredMd);
            const [, z] = intersectionReferenceSystem.project(hoveredMd);
            hoveredMdPoint3d = [x, y, z];
        }
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

    // Set loading status
    statusWriter.setLoading(polylineIntersectionQuery.isFetching || wellboreCasingQuery.isFetching);

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

    const handleZoomTransformChange = React.useCallback(function handleZoomTransformChange(
        zoomTransform: ZoomTransform
    ) {
        props.workbenchServices.publishGlobalData("global.syncValue.cameraPositionIntersection", zoomTransform);
    },
    []);

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full">
            <Intersection
                referenceSystem={intersectionReferenceSystem}
                polylineIntersectionData={polylineIntersectionQuery.data ?? null}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                gridBoundingBox3d={gridModelBoundingBox3d}
                colorScale={colorScale}
                showGridLines={showGridLines}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                hoveredMd={hoveredMd3dGrid}
                onReadout={handleReadout}
                onZoomTransformChange={handleZoomTransformChange}
                intersectionType={intersectionType}
                zoomTransform={syncedZoomTransform}
            />
        </div>
    );
}
