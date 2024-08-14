import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { View as DeckGlView } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { BaseLayer, LayerStatus, useLayers, useLayersStatuses } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import { LayerManagerTopic, useLayerManagerTopicValue } from "@modules/_shared/layers/LayerManager";
import { ViewportType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer, { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { Axes2DLayer, MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const allItems = useLayerManagerTopicValue(layerManager, LayerManagerTopic.ITEMS_CHANGED);
    const layerItems = useLayerManagerTopicValue(layerManager, LayerManagerTopic.LAYERS_CHANGED_RECURSIVELY);

    const layers = useLayers(layerItems);
    const layersStatuses = useLayersStatuses(layers);

    statusWriter.setLoading(layersStatuses.some((status) => status.status === LayerStatus.LOADING));

    const groupLayersMap: Map<string, Layer[]> = new Map();
    const globalLayers: Layer[] = [];

    const items = allItems.filter((item) => item instanceof BaseLayer || item instanceof LayerGroup) as (
        | BaseLayer<any, any>
        | LayerGroup
    )[];

    for (const item of items) {
        if (!item.getIsVisible()) {
            continue;
        }
        if (item instanceof BaseLayer) {
            const data = item.getData();
            if (data) {
                for (const surfData of data) {
                    globalLayers.push(
                        new MapLayer({
                            id: item.getId(),
                            meshData: surfData.valuesFloat32Arr,
                            typedArraySupport: true,

                            frame: {
                                origin: [surfData.surface_def.origin_utm_x, surfData.surface_def.origin_utm_y],
                                count: [surfData.surface_def.npoints_x, surfData.surface_def.npoints_y],
                                increment: [surfData.surface_def.inc_x, surfData.surface_def.inc_y],
                                rotDeg: surfData.surface_def.rot_deg,
                            },
                            contours: [0, 100],
                            isContoursDepth: true,
                            gridLines: false,
                            material: true,
                            smoothShading: true,
                            colorMapName: "Physics",
                        })
                    );
                }
            }
        } else if (item instanceof LayerGroup) {
            const layers = item.getLayers();
            const groupLayers: Layer[] = [];
            for (const layer of layers) {
                if (!layer.getIsVisible()) {
                    continue;
                }
                const data = layer.getData();
                if (data) {
                    for (const surfData of data) {
                        groupLayers.push(
                            new MapLayer({
                                id: item.getId(),
                                meshData: surfData.valuesFloat32Arr,
                                typedArraySupport: true,
                                frame: {
                                    origin: [surfData.surface_def.origin_utm_x, surfData.surface_def.origin_utm_y],
                                    count: [surfData.surface_def.npoints_x, surfData.surface_def.npoints_y],
                                    increment: [surfData.surface_def.inc_x, surfData.surface_def.inc_y],
                                    rotDeg: surfData.surface_def.rot_deg,
                                },
                                contours: [0, 100],
                                isContoursDepth: true,
                                gridLines: false,
                                material: true,
                                smoothShading: true,
                                colorMapName: "Physics",
                            })
                        );
                    }
                }
            }
            groupLayersMap.set(item.getName(), groupLayers);
        }
    }

    const numCols = Math.ceil(Math.sqrt(groupLayersMap.size));
    const numRows = Math.ceil(groupLayersMap.size / numCols);

    const viewports: ViewportType[] = [];
    const viewerLayers: Layer[] = [];
    const viewportAnnotations: React.ReactNode[] = [];
    for (const [group, layers] of groupLayersMap) {
        viewports.push({
            id: group,
            name: group,
            layerIds: [
                ...layers.map((layer) => (layer as unknown as Layer).id),
                ...globalLayers.map((layer) => layer.id),
                "axes",
            ],
        });
        viewerLayers.push(...layers);
        viewportAnnotations.push(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            /* @ts-expect-error */
            <DeckGlView key={group} id={group}>
                <div className="w-full text-center font-bold text-lg">{group}</div>
            </DeckGlView>
        );
    }
    viewerLayers.push(...globalLayers);
    viewerLayers.push(
        new Axes2DLayer({
            id: "axes",
            axisColor: [80, 80, 80],
            backgroundColor: [250, 250, 250],
        })
    );

    const views: ViewsType = {
        layout: [numRows, numCols],
        viewports: viewports,
        showLabel: true,
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer
                id="deckgl"
                views={views}
                layers={viewerLayers}
                scale={{
                    visible: true,
                    incrementValue: 100,
                    widthPerUnit: 100,
                    cssStyle: {
                        right: 10,
                        top: 10,
                    },
                }}
            >
                {viewportAnnotations}
            </SubsurfaceViewer>
        </div>
    );
}
