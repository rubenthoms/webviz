import { SortableListGroup } from "@lib/components/SortableList";

import { makeComponent } from "./utils";

import { Group, GroupBaseTopic, useGroupBaseTopicValue } from "../GroupHandler";

export type LayerComponentProps = {
    group: Group;
};

export function GroupComponent(props: LayerComponentProps): React.ReactNode {
    const children = useGroupBaseTopicValue(props.group.getGroupHandler(), GroupBaseTopic.CHILDREN_CHANGED);

    return (
        <SortableListGroup key={props.group.getId()} id={props.group.getId()} title={props.group.getName()}>
            {children.map((child) => makeComponent(child))}
        </SortableListGroup>
    );
}
