import React from "react";

import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { ColorScaleGradientType } from "@lib/utils/ColorScale";
import { useWellboreTrajectoriesQuery } from "@modules/_shared/WellBore";
import { useFieldWellboreTrajectoriesQuery } from "@modules/_shared/WellBore/queryHooks";
import { EsvIntersectionReadoutEvent } from "@modules/_shared/components/EsvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";

import { useAtomValue } from "jotai";

import { intersectionReferenceSystemAtom } from "./atoms/derivedAtoms";
import { Grid3D } from "./components/grid3d";
import { Intersection } from "./components/intersection";
import { useGridParameterQuery, useGridSurfaceQuery } from "./queries/gridQueries";
import { useGridPolylineIntersection as useGridPolylineIntersectionQuery } from "./queries/polylineIntersection";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { selectedEnsembleIdentAtom, selectedWellboreUuidAtom } from "../sharedAtoms/sharedAtoms";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);

    const colorScale = props.workbenchSettings.useContinuousColorScale({
        gradientType: ColorScaleGradientType.Sequential,
    });

    const ensembleIdent = useAtomValue(selectedEnsembleIdentAtom);
    const intersectionReferenceSystem = useAtomValue(intersectionReferenceSystemAtom);

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

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [hoveredMd3dGrid, setHoveredMd3dGrid] = React.useState<number | null>(null);

    const fieldWellboreTrajectoriesQuery = useFieldWellboreTrajectoriesQuery(ensembleIdent?.getCaseUuid() ?? undefined);

    if (fieldWellboreTrajectoriesQuery.isError) {
        statusWriter.addError(fieldWellboreTrajectoriesQuery.error.message);
    }

    const polylineUtmXy: number[] = [];
    let hoveredMdPoint3d: number[] | null = null;

    if (intersectionReferenceSystem) {
        const extendedTrajectory = intersectionReferenceSystem.getExtendedTrajectory(
            10,
            intersectionExtensionLength,
            intersectionExtensionLength
        );

        for (const point of extendedTrajectory.points) {
            polylineUtmXy.push(point[0], point[1]);
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

    return (
        <div className="w-full h-full">
            <Grid3D
                gridSurfaceData={gridSurfaceQuery.data ?? null}
                gridParameterData={gridParameterQuery.data ?? null}
                fieldWellboreTrajectoriesData={fieldWellboreTrajectoriesQuery.data ?? null}
                selectedWellboreUuid={wellboreUuid}
                polylineIntersectionData={polylineIntersectionQuery.data ?? null}
                boundingBox3d={gridModelBoundingBox3d}
                colorScale={colorScale}
                showGridLines={showGridLines}
                zFactor={zFactor}
                hoveredMdPoint3d={hoveredMdPoint3d}
                onHoveredMdChange={handleGrid3DMdChange}
            />
            <Intersection
                referenceSystem={intersectionReferenceSystem}
                polylineIntersectionData={polylineIntersectionQuery.data ?? null}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                gridBoundingBox3d={gridModelBoundingBox3d}
                colorScale={colorScale}
                showGridLines={showGridLines}
                zFactor={zFactor}
                intersectionExtensionLength={intersectionExtensionLength}
                hoveredMd={hoveredMd3dGrid}
                onReadout={handleReadout}
            />
        </div>
    );
}
