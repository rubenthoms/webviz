import { SortableListGroup } from "@lib/components/SortableList";
import { Delete, Visibility, VisibilityOff } from "@mui/icons-material";

import { makeComponent } from "./utils";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { GroupBaseTopic } from "../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { Group, Item } from "../interfaces";

export type GroupComponentProps = {
    group: Group;
};

export function GroupComponent(props: GroupComponentProps): React.ReactNode {
    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupBaseTopic.CHILDREN);

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={props.group.getItemDelegate().getName()}
            startAdornment={<StartActions group={props.group} />}
            endAdornment={<Actions group={props.group} />}
        >
            {children.map((child: Item) => makeComponent(child))}
        </SortableListGroup>
    );
}

type StartActionsProps = {
    group: Group;
};

function StartActions(props: StartActionsProps): React.ReactNode {
    const visible = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleVisibility() {
        props.group.getItemDelegate().setIsVisible(!visible);
    }

    return (
        <div className="flex items-center">
            <button onClick={handleToggleVisibility}>
                {props.group.getItemDelegate().isVisible() ? (
                    <Visibility fontSize="inherit" />
                ) : (
                    <VisibilityOff fontSize="inherit" />
                )}
            </button>
        </div>
    );
}

type ActionProps = {
    group: Group;
};

function Actions(props: ActionProps): React.ReactNode {
    function handleRemove() {
        const parentGroup = props.group.getItemDelegate().getParentGroup();
        if (parentGroup) {
            parentGroup.removeChild(props.group);
        }
    }

    return (
        <>
            <div
                className="hover:cursor-pointer rounded hover:text-red-800"
                onClick={handleRemove}
                title="Remove layer group"
            >
                <Delete fontSize="inherit" />
            </div>
        </>
    );
}
