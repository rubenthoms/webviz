import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { BaseLayer, LayerStatus, useLayersStatuses } from "@modules/_shared/layers/BaseLayer";
import { LayerManagerTopic, useLayerManagerTopicValue } from "@modules/_shared/layers/LayerManager";
import { ViewportType } from "@webviz/subsurface-viewer";
import SubsurfaceViewer, { ViewsType } from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { SurfaceLayer } from "../layers/SurfaceLayer";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const items = useLayerManagerTopicValue(layerManager, LayerManagerTopic.ITEMS_CHANGED);
    const layers = items.filter((item) => item instanceof BaseLayer) as BaseLayer<any, any>[];
    const layersStatuses = useLayersStatuses(layers.filter((el) => el instanceof BaseLayer) as BaseLayer<any, any>[]);

    statusWriter.setLoading(layersStatuses.some((status) => status.status === LayerStatus.LOADING));

    const groupLayersMap: Map<string, Layer[]> = new Map();

    for (const layer of layers) {
        const groupId = layerManager.getGroupOfLayer(layer.getId())?.getId() ?? "main";
        let layerArr = groupLayersMap.get(groupId);
        if (!layerArr) {
            layerArr = [];
            groupLayersMap.set(groupId, layerArr);
        }
        if (layer instanceof SurfaceLayer) {
            const data = layer.getData();
            if (data) {
                for (const surfData of data) {
                    layerArr.push(
                        new MapLayer({
                            id: layer.getId(),
                            meshData: Array.from(surfData.valuesFloat32Arr),
                            frame: {
                                origin: [surfData.x_ori ?? 0, surfData.y_ori ?? 0],
                                count: [surfData.x_count ?? 0, surfData.y_count ?? 0],
                                increment: [surfData.x_inc ?? 0, surfData.y_inc ?? 0],
                                rotDeg: surfData.rot_deg ?? 0,
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
    }

    const numCols = Math.ceil(Math.sqrt(groupLayersMap.size));
    const numRows = Math.ceil(groupLayersMap.size / numCols);

    const viewports: ViewportType[] = [];
    const viewerLayers: Layer[] = [];
    for (const [group, layers] of groupLayersMap) {
        viewports.push({
            id: group,
            name: group,
            layerIds: layers.map((layer) => (layer as unknown as Layer).id),
        });
        viewerLayers.push(...layers);
    }

    const views: ViewsType = {
        layout: [numRows, numCols],
        viewports: viewports,
    };

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer id="deckgl" views={views} layers={viewerLayers} />
        </div>
    );
}
