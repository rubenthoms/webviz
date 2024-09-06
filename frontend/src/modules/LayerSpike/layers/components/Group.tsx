import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListGroup } from "@lib/components/SortableList";

import { makeComponent } from "./utils";

import { GroupBaseTopic, useGroupBaseTopicValue } from "../GroupHandler";
import { Group } from "../interfaces";

export type LayerComponentProps = {
    group: Group;
    workbenchSettings: WorkbenchSettings;
    workbenchSession: WorkbenchSession;
};

export function GroupComponent(props: LayerComponentProps): React.ReactNode {
    const children = useGroupBaseTopicValue(props.group.getGroupHandler(), GroupBaseTopic.CHILDREN_CHANGED);

    return (
        <SortableListGroup key={props.group.getId()} id={props.group.getId()} title={props.group.getName()}>
            {children.map((child) => makeComponent(child, props.workbenchSettings, props.workbenchSession))}
        </SortableListGroup>
    );
}
