import { SortableListItemProps } from "@lib/components/SortableList";

import { GroupComponent } from "./Group";
import { Layer } from "./Layer";

import { GroupHandler } from "../GroupHandler";
import { Item } from "../ItemBase";
import { LayerBase } from "../LayerBase";

export function makeComponent(item: Item): React.ReactElement<SortableListItemProps> {
    if (item instanceof LayerBase) {
        return <Layer layer={item} onRemove={() => {}} />;
    }
    if (item instanceof GroupHandler) {
        return <GroupComponent group={item} />;
    }
    throw new Error("Not implemented");
}
