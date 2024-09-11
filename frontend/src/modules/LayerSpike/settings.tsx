import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { SortableList } from "@lib/components/SortableList";
import { GroupAdd, Layers, Share } from "@mui/icons-material";
import { useQueryClient } from "@tanstack/react-query";

import { GroupBaseTopic } from "./layers/GroupDelegate";
import { LayerManager } from "./layers/LayerManager";
import { usePublishSubscribeTopicValue } from "./layers/PublishSubscribeHandler";
import { SharedSetting } from "./layers/SharedSetting";
import { View } from "./layers/View";
import { makeComponent } from "./layers/components/utils";
import { ObservedSurfaceLayer } from "./layers/implementations/layers/ObservedSurfaceLayer/ObservedSurfaceLayer";
import { RealizationSurfaceLayer } from "./layers/implementations/layers/RealizationSurfaceLayer/RealizationSurfaceLayer";
import { StatisticalSurfaceLayer } from "./layers/implementations/layers/StatisticalSurfaceLayer/StatisticalSurfaceLayer";
import { Realization } from "./layers/implementations/settings/Realization";
import { instanceofGroup } from "./layers/interfaces";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const queryClient = useQueryClient();
    const layerManager = React.useRef<LayerManager>(
        new LayerManager(props.workbenchSession, props.workbenchSettings, queryClient)
    );
    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupBaseTopic.CHILDREN);

    function handleAddRealLayer() {
        groupDelegate.appendChild(new RealizationSurfaceLayer());
    }
    function handleAddStatLayer() {
        groupDelegate.appendChild(new StatisticalSurfaceLayer());
    }
    function handleAddObsLayer() {
        groupDelegate.appendChild(new ObservedSurfaceLayer());
    }
    function handleAddGroup() {
        groupDelegate.appendChild(new View("New Group"));
    }

    function handleAddSharedSetting() {
        groupDelegate.appendChild(new SharedSetting(new Realization()));
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
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                <div className="flex-grow font-bold text-sm">Layers</div>
                <button className="bg-black text-white p-1 rounded" onClick={handleAddRealLayer}>
                    <Layers />
                </button>
                <button className="bg-black text-white p-1 rounded" onClick={handleAddStatLayer}>
                    <Layers />
                </button>
                <button className="bg-black text-white p-1 rounded" onClick={handleAddObsLayer}>
                    <Layers />
                </button>
                <button className="bg-black text-white p-1 rounded" onClick={handleAddGroup}>
                    <GroupAdd />
                </button>
                <button className="bg-black text-white p-1 rounded" onClick={handleAddSharedSetting}>
                    <Share />
                </button>
            </div>
            <div className="w-full flex-grow flex flex-col relative">
                <SortableList onItemMoved={handleItemMoved}>{items.map((item) => makeComponent(item))}</SortableList>
            </div>
        </div>
    );
}
