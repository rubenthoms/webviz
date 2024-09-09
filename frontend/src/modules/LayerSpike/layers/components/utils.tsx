import { SortableListItemProps } from "@lib/components/SortableList";

import { GroupComponent } from "./GroupComponent";
import { LayerComponent } from "./LayerComponent";

import { Item, instanceofGroup, instanceofLayer } from "../interfaces";

export function makeComponent(item: Item): React.ReactElement<SortableListItemProps> {
    if (instanceofLayer(item)) {
        return <LayerComponent key={item.getId()} layer={item} onRemove={() => {}} />;
    }
    if (instanceofGroup(item)) {
        return <GroupComponent key={item.getId()} group={item} />;
    }
    throw new Error("Not implemented");
}
