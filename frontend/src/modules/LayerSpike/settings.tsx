import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { SortableList } from "@lib/components/SortableList";
import { GroupAdd, Layers, Share } from "@mui/icons-material";

import { GroupBaseTopic, useGroupBaseTopicValue } from "./layers/GroupDelegate";
import { LayerManager } from "./layers/LayerManager";
import { SharedSetting } from "./layers/SharedSetting";
import { makeComponent } from "./layers/components/utils";
import { Realization } from "./layers/implementations/Realization";
import { SurfaceLayer } from "./layers/implementations/SurfaceLayer/SurfaceLayer";
import { instanceofGroup } from "./layers/interfaces";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const layerManager = React.useRef<LayerManager>(new LayerManager(props.workbenchSession, props.workbenchSettings));
    const groupDelegate = layerManager.current.getGroupDelegate();
    const items = useGroupBaseTopicValue(groupDelegate, GroupBaseTopic.CHILDREN_CHANGED);

    function handleAddLayer() {
        groupDelegate.appendChild(new SurfaceLayer());
    }

    function handleAddGroup() {
        groupDelegate.appendChild(layerManager.current.makeView("New Group"));
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
                <button className="bg-black text-white p-1 rounded" onClick={handleAddLayer}>
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
