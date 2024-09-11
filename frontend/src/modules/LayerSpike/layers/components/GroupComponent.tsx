import { SortableListGroup } from "@lib/components/SortableList";
import { Visibility, VisibilityOff } from "@mui/icons-material";

import { makeComponent } from "./utils";

import { GroupBaseTopic } from "../GroupDelegate";
import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { Group, Item } from "../interfaces";

export type LayerComponentProps = {
    group: Group;
};

export function GroupComponent(props: LayerComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupBaseTopic.CHILDREN);

    return (
        <SortableListGroup
            key={props.group.getId()}
            id={props.group.getId()}
            title={props.group.getName()}
            startAdornment={<StartActions group={props.group} />}
        >
            {children.map((child: Item) => makeComponent(child))}
        </SortableListGroup>
    );
}

type StartActionsProps = {
    group: Group;
};

function StartActions(props: StartActionsProps): React.ReactNode {
    const visible = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupBaseTopic.VISIBILITY);

    function handleToggleVisibility() {
        props.group.getGroupDelegate().setVisibility(!visible);
    }

    return (
        <div className="flex items-center">
            <button onClick={handleToggleVisibility}>
                {props.group.getGroupDelegate().isVisible() ? <Visibility /> : <VisibilityOff />}
            </button>
        </div>
    );
}
