import React from "react";

import { ViewContext } from "@framework/ModuleContext";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { Rect2D, outerRectContainsInnerRect } from "@lib/utils/geometry";
import { Interfaces } from "@modules/2DViewer/interfaces";
import { LayerManager, LayerManagerTopic } from "@modules/2DViewer/layers/LayerManager";
import { usePublishSubscribeTopicValue } from "@modules/2DViewer/layers/delegates/PublishSubscribeDelegate";
import { BoundingBox } from "@modules/2DViewer/layers/interfaces";
import { PreferredViewLayout } from "@modules/2DViewer/types";
import { ColorScaleWithId } from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ViewportType } from "@webviz/subsurface-viewer";
import { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";

import { ResizeWrapper, ViewportInfo } from "./ResizeWrapper";

import { PlaceholderLayer } from "../customDeckGlLayers/PlaceholderLayer";
import { DeckGlLayerWithPosition, recursivelyMakeViewsAndLayers } from "../utils/makeViewsAndLayers";

export type LayersWrapperProps = {
    layerManager: LayerManager;
    preferredViewLayout: PreferredViewLayout;
    viewContext: ViewContext<Interfaces>;
};

export function LayersWrapper(props: LayersWrapperProps): React.ReactNode {
    const [prevBoundingBox, setPrevBoundingBox] = React.useState<BoundingBox | null>(null);
    const statusWriter = useViewStatusWriter(props.viewContext);

    usePublishSubscribeTopicValue(props.layerManager, LayerManagerTopic.LAYER_DATA_REVISION);

    const viewports: ViewportType[] = [];
    const viewerLayers: DeckGlLayerWithPosition[] = [];
    const viewportInfoArr: ViewportInfo[] = [];
    const globalColorScales: ColorScaleWithId[] = [];

    const views: ViewsType = {
        layout: [1, 1],
        viewports: viewports,
        showLabel: false,
    };

    let numCols = 0;
    let numRows = 0;

    let numLoadingLayers = 0;

    const viewsAndLayers = recursivelyMakeViewsAndLayers(props.layerManager);

    numCols = Math.ceil(Math.sqrt(viewsAndLayers.views.length));
    numRows = Math.ceil(viewsAndLayers.views.length / numCols);

    if (props.preferredViewLayout === PreferredViewLayout.HORIZONTAL) {
        [numCols, numRows] = [numRows, numCols];
    }

    views.layout = [numCols, numRows];

    viewerLayers.push(...viewsAndLayers.layers);
    globalColorScales.push(...viewsAndLayers.colorScales);
    const globalLayerIds = viewsAndLayers.layers.map((layer) => layer.layer.id);

    for (const view of viewsAndLayers.views) {
        viewports.push({
            id: view.id,
            name: view.name,
            isSync: true,
            layerIds: [...globalLayerIds, ...view.layers.map((layer) => layer.layer.id), "placeholder"],
        });
        viewerLayers.push(...view.layers);

        viewportInfoArr.push({
            id: view.id,
            color: view.color,
            name: view.name,
            colorLegend: {
                colorScales: [...view.colorScales, ...globalColorScales],
                position: "left",
                height: 0,
            },
        });
    }

    if (viewsAndLayers.boundingBox !== null) {
        if (prevBoundingBox !== null) {
            const oldBoundingRect: Rect2D | null = {
                x: prevBoundingBox.x[0],
                y: prevBoundingBox.y[0],
                width: prevBoundingBox.x[1] - prevBoundingBox.x[0],
                height: prevBoundingBox.y[1] - prevBoundingBox.y[0],
            };

            const newBoundingRect: Rect2D = {
                x: viewsAndLayers.boundingBox.x[0],
                y: viewsAndLayers.boundingBox.y[0],
                width: viewsAndLayers.boundingBox.x[1] - viewsAndLayers.boundingBox.x[0],
                height: viewsAndLayers.boundingBox.y[1] - viewsAndLayers.boundingBox.y[0],
            };

            if (!outerRectContainsInnerRect(oldBoundingRect, newBoundingRect)) {
                setPrevBoundingBox(viewsAndLayers.boundingBox);
            }
        } else {
            setPrevBoundingBox(viewsAndLayers.boundingBox);
        }
    }

    numLoadingLayers = viewsAndLayers.numLoadingLayers;
    statusWriter.setLoading(viewsAndLayers.numLoadingLayers > 0);

    for (const message of viewsAndLayers.errorMessages) {
        statusWriter.addError(message);
    }

    let bounds: [number, number, number, number] | undefined = undefined;
    if (prevBoundingBox) {
        bounds = [prevBoundingBox.x[0], prevBoundingBox.y[0], prevBoundingBox.x[1], prevBoundingBox.y[1]];
    }

    const layers = viewerLayers.toSorted((a, b) => b.position - a.position).map((layer) => layer.layer);
    layers.push(new PlaceholderLayer({ id: "placeholder" }));

    return (
        <ResizeWrapper
            numRows={numRows}
            views={views}
            viewportInfoArray={viewportInfoArr}
            layers={layers}
            bounds={bounds}
            isPending={numLoadingLayers > 0}
        />
    );
}
