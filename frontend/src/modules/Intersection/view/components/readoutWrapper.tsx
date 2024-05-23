import React from "react";

import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ViewContext } from "@framework/ModuleContext";
import { GlobalTopicDefinitions, WorkbenchServices, useSubscribedValue } from "@framework/WorkbenchServices";
import { SettingsToViewInterface } from "@modules/Intersection/settingsToViewInterface";
import { State } from "@modules/Intersection/state";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    Viewport,
} from "@modules/_shared/components/EsvIntersection";
import { HighlightItem, HighlightItemShape, ReadoutItem } from "@modules/_shared/components/EsvIntersection/types";
import { ReadoutBox } from "@modules/_shared/components/EsvIntersection/utilityComponents/ReadoutBox";
import { isWellborepathLayer } from "@modules/_shared/components/EsvIntersection/utils/layers";

import { isEqual } from "lodash";

import { ViewAtoms } from "../atoms/atomDefinitions";

export type ReadoutWrapperProps = {
    wellboreHeaderUuid: string | null;
    showGrid: boolean;
    referenceSystem?: IntersectionReferenceSystem;
    layers: LayerItem[];
    viewport?: Viewport;
    onViewportChange: (viewport: Viewport) => void;
    bounds: {
        x: [number, number];
        y: [number, number];
    };
    verticalScale: number;
    workbenchServices: WorkbenchServices;
    viewContext: ViewContext<State, SettingsToViewInterface, Record<string, never>, ViewAtoms>;
};

export function ReadoutWrapper(props: ReadoutWrapperProps): React.ReactNode {
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);

    const [hoveredMd, setHoveredMd] = React.useState<number | null>(null);
    const [prevHoveredMd, setPrevHoveredMd] = React.useState<GlobalTopicDefinitions["global.hoverMd"] | null>(null);
    const syncedHoveredMd = useSubscribedValue(
        "global.hoverMd",
        props.workbenchServices,
        props.viewContext.getInstanceIdString()
    );

    if (!isEqual(syncedHoveredMd, prevHoveredMd)) {
        setPrevHoveredMd(syncedHoveredMd);
        if (syncedHoveredMd?.wellboreUuid === props.wellboreHeaderUuid) {
            setHoveredMd(syncedHoveredMd?.md ?? null);
        } else {
            setHoveredMd(null);
        }
    }

    const moduleInstanceId = props.viewContext.getInstanceIdString();

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            setReadoutItems(event.readoutItems);
            const items = event.readoutItems;
            const wellboreReadoutItem = items.find((item) => isWellborepathLayer(item.layer));
            const md = wellboreReadoutItem?.md;
            if (!md || !props.wellboreHeaderUuid) {
                props.workbenchServices.publishGlobalData("global.hoverMd", null);
                return;
            }
            props.workbenchServices.publishGlobalData(
                "global.hoverMd",
                { wellboreUuid: props.wellboreHeaderUuid, md: md },
                moduleInstanceId
            );
        },
        [moduleInstanceId, props.wellboreHeaderUuid, props.workbenchServices]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && hoveredMd) {
        const point = props.referenceSystem.project(hoveredMd);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
            paintOrder: 6,
        });
    }

    return (
        <>
            <EsvIntersection
                showGrid={props.showGrid}
                zFactor={props.verticalScale}
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                axesOptions={{
                    xLabel: "U",
                    yLabel: "TVD",
                    unitOfMeasure: "m",
                }}
                layers={props.layers}
                bounds={props.bounds}
                viewport={props.viewport ?? undefined}
                intersectionThreshold={50}
                highlightItems={highlightItems}
                onReadout={handleReadoutItemsChange}
                onViewportChange={props.onViewportChange}
            />
            <ReadoutBox readoutItems={readoutItems} />
        </>
    );
}
