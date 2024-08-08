import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";
import { CircularProgress } from "@lib/components/CircularProgress";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { LayerStatus, useLayersStatuses } from "@modules_shared/layers/BaseLayer";
import { LayerManagerTopic, useLayerManagerTopicValue } from "@modules_shared/layers/LayerManager";

import { ViewAtoms } from "./atoms/atomDefinitions";
import { LayersWrapper } from "./components/layersWrapper";
import { useWellboreCasingsQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";
import { isGridLayer } from "../utils/layers/GridLayer";
import { isSeismicLayer } from "../utils/layers/SeismicLayer";
import { isSurfaceLayer } from "../utils/layers/SurfaceLayer";
import { isSurfacesUncertaintyLayer } from "../utils/layers/SurfacesUncertaintyLayer";
import { isWellpicksLayer } from "../utils/layers/WellpicksLayer";

export function View(
    props: ModuleViewProps<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>
): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const intersectionReferenceSystem = props.viewContext.useViewAtomValue("intersectionReferenceSystemAtom");
    const wellboreHeader = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");
    const wellboreTrajectoryQuery = props.viewContext.useViewAtomValue("wellboreTrajectoryQueryAtom");
    const polyline = props.viewContext.useViewAtomValue("polylineAtom");
    const extensionLength = props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const wellbore = props.viewContext.useSettingsToViewInterfaceValue("wellboreHeader");

    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const layers = useLayerManagerTopicValue(layerManager, LayerManagerTopic.LAYERS_CHANGED);
    const layersStatuses = useLayersStatuses(layers);

    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const intersectionType = props.viewContext.useSettingsToViewInterfaceValue("intersectionType");

    React.useEffect(
        function handleLayerSettingsChange() {
            for (const layer of layers) {
                if (isGridLayer(layer)) {
                    layer.maybeUpdateSettings({ polyline, extensionLength });
                    layer.maybeRefetchData();
                }
                if (isSeismicLayer(layer)) {
                    layer.maybeUpdateSettings({ polyline, extensionLength });
                    layer.maybeRefetchData();
                }
                if (isSurfaceLayer(layer)) {
                    layer.maybeUpdateSettings({ polyline, extensionLength });
                    layer.maybeRefetchData();
                }
                if (isSurfacesUncertaintyLayer(layer)) {
                    layer.maybeUpdateSettings({ polyline, extensionLength });
                    layer.maybeRefetchData();
                }
            }
        },
        [polyline, extensionLength, layers]
    );

    React.useEffect(
        function handleWellpicksLayerSettingsChange() {
            for (const layer of layers) {
                if (isWellpicksLayer(layer)) {
                    layer.maybeUpdateSettings({
                        ensembleIdent,
                        wellboreUuid: intersectionType === IntersectionType.WELLBORE ? wellbore?.uuid : null,
                    });
                    layer.maybeRefetchData();
                }
            }
        },
        [layers, wellbore, ensembleIdent, intersectionType]
    );

    React.useEffect(
        function handleTitleChange() {
            let ensembleName = "";
            if (ensembleIdent) {
                const ensemble = ensembleSet.findEnsemble(ensembleIdent);
                ensembleName = ensemble?.getDisplayName() ?? "";
            }

            props.viewContext.setInstanceTitle(
                `${wellboreHeader?.identifier ?? "Intersection"}
            (${ensembleName})`
            );
        },
        [ensembleSet, ensembleIdent, wellboreHeader?.identifier, props.viewContext]
    );

    // Status messages
    for (const layer of layers) {
        if (layer.getStatus() === LayerStatus.ERROR) {
            statusWriter.addError(
                layer.getError() ?? `Layer "${layer.getName()}": ${layer.getError() ?? "Unknown error"}`
            );
        }
    }

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingsQuery(wellboreHeader?.uuid ?? undefined);

    // Set loading status
    const mainElementsLoading =
        wellboreTrajectoryQuery.isFetching || layersStatuses.some((status) => status.status === LayerStatus.LOADING);
    statusWriter.setLoading(mainElementsLoading || wellboreCasingQuery.isFetching);

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full relative">
            <div
                className={resolveClassNames(
                    "absolute w-full h-full z-10 bg-white opacity-50 flex items-center justify-center",
                    { hidden: !mainElementsLoading }
                )}
            >
                <CircularProgress />
            </div>
            <LayersWrapper
                referenceSystem={wellboreTrajectoryQuery.isFetching ? null : intersectionReferenceSystem}
                layers={wellboreTrajectoryQuery.isFetching ? [] : layers}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                intersectionType={intersectionType}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={wellboreTrajectoryQuery.isFetching ? null : wellboreHeader?.uuid ?? null}
                wellboreHeaderDepthReferencePoint={wellboreHeader?.depthReferencePoint ?? null}
                wellboreHeaderDepthReferenceElevation={wellboreHeader?.depthReferenceElevation ?? null}
            />
        </div>
    );
}
