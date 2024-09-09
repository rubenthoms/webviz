import { SortableListGroup } from "@lib/components/SortableList";

import { makeComponent } from "./utils";

import { GroupBaseTopic, useGroupBaseTopicValue } from "../GroupDelegate";
import { Group } from "../interfaces";

export type LayerComponentProps = {
    group: Group;
};

export function GroupComponent(props: LayerComponentProps): React.ReactNode {
    const children = useGroupBaseTopicValue(props.group.getGroupDelegate(), GroupBaseTopic.CHILDREN_CHANGED);

    return (
        <SortableListGroup key={props.group.getId()} id={props.group.getId()} title={props.group.getName()}>
            {children.map((child) => makeComponent(child))}
        </SortableListGroup>
    );
}
