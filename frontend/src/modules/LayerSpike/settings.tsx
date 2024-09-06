import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { SortableList } from "@lib/components/SortableList";
import { GroupAdd, Layers } from "@mui/icons-material";

import { GroupBaseTopic, GroupHandler, useGroupBaseTopicValue } from "./layers/GroupHandler";
import { View } from "./layers/View";
import { makeComponent } from "./layers/components/utils";
import { SurfaceLayer } from "./layers/implementations/SurfaceLayer";
import { instanceofGroup } from "./layers/interfaces";

export function Settings(props: ModuleSettingsProps<any>): React.ReactNode {
    const mainGroup = React.useRef<GroupHandler>(new GroupHandler());

    const items = useGroupBaseTopicValue(mainGroup.current, GroupBaseTopic.CHILDREN_CHANGED);

    function handleAddLayer() {
        mainGroup.current.appendChild(new SurfaceLayer());
    }

    function handleAddGroup() {
        mainGroup.current.appendChild(new View("View"));
    }

    function handleItemMoved(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number
    ) {
        const movedItem = mainGroup.current.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        let origin = mainGroup.current;
        if (originId) {
            const candidate = mainGroup.current.findDescendantById(originId);
            if (candidate && instanceofGroup(candidate)) {
                origin = candidate.getGroupHandler();
            }
        }

        let destination = mainGroup.current;
        if (destinationId) {
            const candidate = mainGroup.current.findDescendantById(destinationId);
            if (candidate && instanceofGroup(candidate)) {
                destination = candidate.getGroupHandler();
            }
        }

        if (origin === destination) {
            origin.moveChild(movedItem, position);
            return;
        }

        destination.insertChild(movedItem, position);
        origin.removeChild(movedItem);
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
            </div>
            <div className="w-full flex-grow flex flex-col relative">
                <SortableList onItemMoved={handleItemMoved}>
                    {items.map((item) => makeComponent(item, props.workbenchSettings, props.workbenchSession))}
                </SortableList>
            </div>
        </div>
    );
}
