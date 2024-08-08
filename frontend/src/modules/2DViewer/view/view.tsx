import React from "react";

import { Layer } from "@deck.gl/core/typed";
import { ModuleViewProps } from "@framework/Module";
import { useViewStatusWriter } from "@framework/StatusWriter";
import { LayerStatus, useLayersStatuses } from "@modules/_shared/layers/BaseLayer";
import { LayerManagerTopic, useLayerManagerTopicValue } from "@modules/_shared/layers/LayerManager";
import SubsurfaceViewer from "@webviz/subsurface-viewer/dist/SubsurfaceViewer";
import { MapLayer } from "@webviz/subsurface-viewer/dist/layers";

import { SurfaceLayer } from "../layers/SurfaceLayer";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): React.ReactNode {
    const statusWriter = useViewStatusWriter(props.viewContext);
    const layerManager = props.viewContext.useSettingsToViewInterfaceValue("layerManager");
    const layers = useLayerManagerTopicValue(layerManager, LayerManagerTopic.LAYERS_CHANGED);
    const layersStatuses = useLayersStatuses(layers);

    statusWriter.setLoading(layersStatuses.some((status) => status.status === LayerStatus.LOADING));

    const viewerLayers: Layer[] = [];

    for (const layer of layers) {
        if (layer instanceof SurfaceLayer) {
            const data = layer.getData();
            if (data) {
                for (const surfData of data) {
                    viewerLayers.push(
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

    return (
        <div className="relative w-full h-full flex flex-col">
            <SubsurfaceViewer id="deckgl" layers={viewerLayers} />
        </div>
    );
}
