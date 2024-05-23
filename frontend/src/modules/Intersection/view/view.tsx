import React from "react";

import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { GlobalTopicDefinitions, useSubscribedValue } from "@framework/WorkbenchServices";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { IntersectionType } from "@framework/types/intersection";
import { EsvIntersectionReadoutEvent, Viewport } from "@modules/_shared/components/EsvIntersection";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";

import { useAtomValue } from "jotai";
import { isEqual } from "lodash";

import { ViewAtoms } from "./atoms/atomDefinitions";
import { Intersection } from "./components/intersection";
import { useWellboreCasingQuery } from "./queries/wellboreSchematicsQueries";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { selectedWellboreAtom } from "../sharedAtoms/sharedAtoms";
import { State } from "../state";
import { LayerStatus, useLayersStatuses } from "../utils/layers/BaseLayer";

export function View(
    props: ModuleViewProps<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>
): JSX.Element {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const syncedSettingKeys = props.viewContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, props.workbenchServices, props.viewContext);

    const ensembleIdent = props.viewContext.useSettingsToViewInterfaceValue("ensembleIdent");
    const intersectionReferenceSystem = props.viewContext.useViewAtomValue("intersectionReferenceSystemAtom");
    const wellboreHeader = useAtomValue(selectedWellboreAtom);

    const layers = props.viewContext.useViewAtomValue("layers");
    const layersStatuses = useLayersStatuses(layers);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [prevHoveredMd, setPrevHoveredMd] = React.useState<GlobalTopicDefinitions["global.hoverMd"] | null>(null);
    const syncedHoveredMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevHoveredMd)) {
        setPrevHoveredMd(syncedHoveredMd);
        if (syncedHoveredMd?.wellboreUuid === wellboreHeader?.uuid) {
            setHoveredMd(syncedHoveredMd?.md ?? null);
        } else {
            setHoveredMd(null);
        }
    }

    const syncedVerticalScale = syncHelper.useValue(SyncSettingKey.VERTICAL_SCALE, "global.syncValue.verticalScale");

    const gridModelName = props.viewContext.useSettingsToViewInterfaceValue("gridModelName");
    const gridModelParameterName = props.viewContext.useSettingsToViewInterfaceValue("gridModelParameterName");
    const gridModelParameterDateOrInterval = props.viewContext.useSettingsToViewInterfaceValue(
        "gridModelParameterDateOrInterval"
    );
    const intersectionExtensionLength =
        props.viewContext.useSettingsToViewInterfaceValue("intersectionExtensionLength");
    const intersectionType = props.viewContext.useSettingsToViewInterfaceValue("intersectionType");

    //const combinedPolylineIntersectionResults = props.viewContext.useViewAtomValue("polylineIntersectionQueriesAtom");

    let ensembleName = "";
    if (ensembleIdent) {
        const ensemble = ensembleSet.findEnsemble(ensembleIdent);
        ensembleName = ensemble?.getDisplayName() ?? "";
    }

    props.viewContext.setInstanceTitle(
        `${wellboreHeader?.identifier} - ${gridModelName ?? "-"}, ${gridModelParameterName ?? "-"}, ${
            gridModelParameterDateOrInterval ?? "-"
        } (${ensembleName})`
    );

    // Status messages
    for (const status of layersStatuses) {
        if (status.status === LayerStatus.ERROR) {
            statusWriter.addError(
                `Layer "${layers
                    .find((el) => el.getId() === status.id)
                    ?.getName()}" encountered an error while loading its data.`
            );
        }
    }

    // Wellbore casing query
    const wellboreCasingQuery = useWellboreCasingQuery(wellboreHeader?.uuid ?? undefined);
    if (wellboreCasingQuery.isError) {
        statusWriter.addError(wellboreCasingQuery.error.message);
    }

    // Set loading status
    statusWriter.setLoading(
        //combinedPolylineIntersectionResults.isFetching ||
        wellboreCasingQuery.isFetching || layersStatuses.some((status) => status.status === LayerStatus.LOADING)
        // ||
        //  seismicFenceDataQuery.isFetching ||
        // seismicImageStatus === SeismicSliceImageStatus.LOADING
    );

    const moduleInstanceId = props.viewContext.getInstanceIdString();

    const handleReadout = React.useCallback(
        function handleReadout(event: EsvIntersectionReadoutEvent) {
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;
            if (!md || !wellboreHeader) {
                props.workbenchServices.publishGlobalData("global.hoverMd", null);
                return;
            }
            props.workbenchServices.publishGlobalData(
                "global.hoverMd",
                { wellboreUuid: wellboreHeader.uuid, md: md },
                moduleInstanceId
            );
        },
        [props.workbenchServices, wellboreHeader, moduleInstanceId]
    );

    const handleCameraPositionChange = React.useCallback(
        function handleCameraPositionChange(cameraPosition: Viewport) {
            props.workbenchServices.publishGlobalData(
                "global.syncValue.cameraPositionIntersection",
                cameraPosition,
                props.viewContext.getInstanceIdString()
            );
        },
        [props.workbenchServices, props.viewContext]
    );

    const handleVerticalScaleChange = React.useCallback(
        function handleVerticalScaleChange(verticalScale: number) {
            props.workbenchServices.publishGlobalData(
                "global.syncValue.verticalScale",
                verticalScale,
                props.viewContext.getInstanceIdString()
            );
        },
        [props.workbenchServices, props.viewContext]
    );

    const potentialIntersectionExtensionLength =
        intersectionType === IntersectionType.WELLBORE ? intersectionExtensionLength : 0;

    return (
        <div className="w-full h-full">
            <Intersection
                referenceSystem={intersectionReferenceSystem}
                layers={layers}
                wellboreCasingData={wellboreCasingQuery.data ?? null}
                intersectionExtensionLength={potentialIntersectionExtensionLength}
                hoveredMd={hoveredMd}
                onReadout={handleReadout}
                onViewportChange={handleCameraPositionChange}
                onVerticalScaleChange={handleVerticalScaleChange}
                intersectionType={intersectionType}
                verticalScale={syncedVerticalScale ?? undefined}
                workbenchServices={props.workbenchServices}
                viewContext={props.viewContext}
                wellboreHeaderUuid={wellboreHeader?.uuid ?? null}
            />
        </div>
    );
}
