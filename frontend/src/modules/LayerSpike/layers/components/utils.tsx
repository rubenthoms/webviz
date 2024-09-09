import { SortableListItemProps } from "@lib/components/SortableList";

import { GroupComponent } from "./GroupComponent";
import { LayerComponent } from "./LayerComponent";
import { SharedSettingComponent } from "./SharedSettingComponent";

import { SharedSetting } from "../SharedSetting";
import { Item, instanceofGroup, instanceofLayer } from "../interfaces";

export function makeComponent(item: Item): React.ReactElement<SortableListItemProps> {
    if (instanceofLayer(item)) {
        return <LayerComponent key={item.getId()} layer={item} onRemove={() => {}} />;
    }
    if (instanceofGroup(item)) {
        return <GroupComponent key={item.getId()} group={item} />;
    }
    if (item instanceof SharedSetting) {
        return <SharedSettingComponent key={item.getId()} sharedSetting={item} onRemove={() => {}} />;
    }
    throw new Error("Not implemented");
}
