import React from "react";

import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { ColorSelector } from "../../components/colorSelector";
import { SortableListGroup } from "../../components/group";
import { GroupDelegateTopic } from "../../delegates/GroupDelegate";
import { ItemDelegateTopic } from "../../delegates/ItemDelegate";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import type { SettingManager } from "../SettingManager/SettingManager";
import { SettingManagerComponent } from "../SettingManager/SettingManagerComponent";
import { EditName } from "../utilityComponents/EditName";
import { EmptyContent } from "../utilityComponents/EmptyContent";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { RemoveItemButton } from "../utilityComponents/RemoveItemButton";
import { VisibilityToggle } from "../utilityComponents/VisibilityToggle";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { Group } from "./Group";

export type GroupComponentProps = {
    group: Group<any, any>;
    isLastItemInParent?: boolean;
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[];
    onActionClick?: (actionIdentifier: string, group: ItemGroup) => void;
    nestingLevel?: number;
};

export function GroupComponent(props: GroupComponentProps): React.ReactNode {
    const { makeActionsForGroup } = props;

    const children = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.CHILDREN);
    const isExpanded = usePublishSubscribeTopicValue(props.group.getItemDelegate(), ItemDelegateTopic.EXPANDED);
    const color = usePublishSubscribeTopicValue(props.group.getGroupDelegate(), GroupDelegateTopic.COLOR);

    const actions = React.useMemo(() => {
        return makeActionsForGroup(props.group);
    }, [props.group, makeActionsForGroup]);

    function handleActionClick(actionIdentifier: string) {
        if (props.onActionClick) {
            props.onActionClick(actionIdentifier, props.group);
        }
    }

    function makeSetting(setting: SettingManager<any>) {
        const manager = props.group.getItemDelegate().getDataProviderManager();
        if (!manager) {
            return null;
        }
        return (
            <SettingManagerComponent key={setting.getId()} setting={setting} manager={manager} sharedSetting={false} />
        );
    }

    function makeSettings(settings: SettingManager<any>[]): React.ReactNode[] {
        const settingNodes: React.ReactNode[] = [];
        for (const setting of settings) {
            settingNodes.push(makeSetting(setting));
        }
        return settingNodes;
    }

    function makeEndAdornment() {
        const adornments: React.ReactNode[] = [];
        adornments.push(<Actions key="actions" actionGroups={actions} onActionClick={handleActionClick} />);
        adornments.push(<ExpandCollapseAllButton key="expand-collapse" group={props.group} />);
        adornments.push(<RemoveItemButton key="remove" item={props.group} />);
        return adornments;
    }

    function handleColorChange(color: string) {
        props.group.getGroupDelegate().setColor(color);
    }

    const emptyContentMessage = props.group.getEmptyContentMessage?.() ?? "Drag an item inside to add it.";

    return (
        <SortableListGroup
            key={props.group.getItemDelegate().getId()}
            id={props.group.getItemDelegate().getId()}
            title={
                <div className="flex gap-1 items-center relative min-w-0">
                    {color && <ColorSelector onChange={handleColorChange} color={color} />}
                    <div className="grow min-w-0">
                        <EditName item={props.group} />
                    </div>
                </div>
            }
            expanded={isExpanded}
            startAdornment={<VisibilityToggle item={props.group} />}
            endAdornment={<>{makeEndAdornment()}</>}
            contentWhenEmpty={<EmptyContent>{emptyContentMessage}</EmptyContent>}
            content={
                props.group.getSharedSettingsDelegate() ? (
                    <div className="text-xs gap-2 grid grid-cols-[auto_1fr] items-center">
                        {makeSettings(Object.values(props.group.getWrappedSettings()))}
                    </div>
                ) : undefined
            }
            isLastItemInParent={props.isLastItemInParent}
            color={color ?? ""}
            nestingLevel={props.nestingLevel ?? 0}
        >
            {children.map((child: Item, index: number) =>
                makeSortableListItemComponent(
                    child,
                    index === children.length - 1,
                    props.makeActionsForGroup,
                    props.onActionClick,
                    (props.nestingLevel ?? 0) + 1,
                ),
            )}
        </SortableListGroup>
    );
}
