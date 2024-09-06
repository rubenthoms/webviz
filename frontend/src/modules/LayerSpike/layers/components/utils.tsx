import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListItemProps } from "@lib/components/SortableList";

import { GroupComponent } from "./Group";
import { Layer } from "./Layer";

import { GroupHandler } from "../GroupHandler";
import { LayerBase } from "../LayerBase";
import { Item, instanceofGroup } from "../interfaces";

export function makeComponent(
    item: Item,
    workbenchSettings: WorkbenchSettings,
    workbenchSession: WorkbenchSession
): React.ReactElement<SortableListItemProps> {
    if (item instanceof LayerBase) {
        return (
            <Layer
                key={item.getId()}
                layer={item}
                onRemove={() => {}}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
            />
        );
    }
    if (instanceofGroup(item)) {
        return (
            <GroupComponent
                key={item.getId()}
                group={item}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
            />
        );
    }
    throw new Error("Not implemented");
}
