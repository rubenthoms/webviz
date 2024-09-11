import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { SortableList } from "@lib/components/SortableList";
import { useQueryClient } from "@tanstack/react-query";

import { LayerManager } from "./layers/LayerManager";
import { usePublishSubscribeTopicValue } from "./layers/PublishSubscribeHandler";
import { SharedSetting } from "./layers/SharedSetting";
import { View } from "./layers/View";
import { makeComponent } from "./layers/components/utils";
import { GroupBaseTopic } from "./layers/delegates/GroupDelegate";
import { SurfaceLayer } from "./layers/implementations/layers/SurfaceLayer/SurfaceLayer";
import { Ensemble } from "./layers/implementations/settings/Ensemble";
import { Realization } from "./layers/implementations/settings/Realization";
import { Item, instanceofGroup } from "./layers/interfaces";
import { LayersPanelActions } from "./layersActions";
import {
    LAYER_TYPE_TO_STRING_MAPPING,
    LayerType,
    SHARED_SETTING_TYPE_TO_STRING_MAPPING,
    SharedSettingType,
} from "./types";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const queryClient = useQueryClient();
    const layerManager = React.useRef<LayerManager>(
        new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient)
    );
    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupBaseTopic.CHILDREN);

    function handleAddLayer(layerType: LayerType) {
        if (layerType === LayerType.SURFACE) {
            groupDelegate.appendChild(new SurfaceLayer());
        }
    }

    function handleAddView() {
        groupDelegate.appendChild(new View("New View"));
    }

    function handleAddSharedSetting(settingType: SharedSettingType) {
        if (settingType === SharedSettingType.ENSEMBLE) {
            groupDelegate.appendChild(new SharedSetting(new Ensemble()));
        }
        if (settingType === SharedSettingType.REALIZATION) {
            groupDelegate.appendChild(new SharedSetting(new Realization()));
        }
    }

    function handleItemMoved(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number
    ) {
        const movedItem = groupDelegate.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        let origin = layerManager.current.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = layerManager.current.getGroupDelegate();
        if (destinationId) {
            const candidate = groupDelegate.findDescendantById(destinationId);
            if (candidate && instanceofGroup(candidate)) {
                destination = candidate.getGroupDelegate();
            }
        }

        if (origin === destination) {
            origin.moveChild(movedItem, position);
            return;
        }

        origin.removeChild(movedItem);
        destination.insertChild(movedItem, position);
    }

    return (
        <div className="w-full h-full flex-grow flex flex-col min-h-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                <div className="flex-grow font-bold text-sm">Layers</div>
                <LayersPanelActions
                    layerTypeToStringMapping={LAYER_TYPE_TO_STRING_MAPPING}
                    settingTypeToStringMapping={SHARED_SETTING_TYPE_TO_STRING_MAPPING}
                    onAddLayer={handleAddLayer}
                    onAddView={handleAddView}
                    onAddSharedSetting={handleAddSharedSetting}
                />
            </div>
            <div className="w-full flex-grow flex flex-col relative bg-slate-300">
                <SortableList onItemMoved={handleItemMoved}>
                    {items.map((item: Item) => makeComponent(item))}
                </SortableList>
            </div>
        </div>
    );
}
