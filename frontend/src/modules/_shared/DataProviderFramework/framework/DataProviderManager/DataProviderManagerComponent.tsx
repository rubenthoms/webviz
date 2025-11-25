import React from "react";

import { Add, Link } from "@mui/icons-material";

import { SortableList } from "@lib/components/SortableList";
import type { IsMoveAllowedArgs } from "@lib/components/SortableList";
import { useElementSize } from "@lib/hooks/useElementSize";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { convertRemToPixels } from "@lib/utils/screenUnitConversions";
import type { GroupDelegate } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";
import { GroupDelegateTopic } from "@modules/_shared/DataProviderFramework/delegates/GroupDelegate";

import type { ActionGroup } from "../../Actions";
import { Actions } from "../../Actions";
import { FixedGroup } from "../../components/fixedGroup";
import { View } from "../../groups/implementations/View";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { instanceofItemGroup } from "../../interfacesAndTypes/entities";
import { SharedSetting } from "../SharedSetting/SharedSetting";
import { ExpandCollapseAllButton } from "../utilityComponents/ExpandCollapseAllButton";
import { makeSortableListItemComponent } from "../utils/makeSortableListItemComponent";

import type { DataProviderManager } from "./DataProviderManager";

export type DataProviderManagerComponentProps = {
    title: string;
    dataProviderManager: DataProviderManager;
    additionalHeaderComponents: React.ReactNode;
    groupActions: ActionGroup[] | ((group: ItemGroup) => ActionGroup[]);
    onAction: (identifier: string, groupDelegate: GroupDelegate) => void;
    isMoveAllowed?: (movedItem: Item, destinationGroup: ItemGroup) => boolean;
};

export function DataProviderManagerComponent(props: DataProviderManagerComponentProps): React.ReactNode {
    const { groupActions } = props;

    const listRef = React.useRef<HTMLDivElement>(null);
    const listSize = useElementSize(listRef);

    const groupDelegate = props.dataProviderManager.getGroupDelegate();
    const items = usePublishSubscribeTopicValue(groupDelegate, GroupDelegateTopic.CHILDREN);

    const sharedSettingsAndOtherItems = React.useMemo(() => {
        const sharedSettings: Item[] = [];
        const otherItems: Item[] = [];
        for (const item of items) {
            if (item instanceof SharedSetting) {
                sharedSettings.push(item);
            } else {
                otherItems.push(item);
            }
        }
        return {
            sharedSettings,
            otherItems,
        };
    }, [items]);

    function handleActionClick(identifier: string, group?: ItemGroup) {
        let groupDelegate = props.dataProviderManager.getGroupDelegate();
        if (group) {
            groupDelegate = group.getGroupDelegate();
        }

        props.onAction(identifier, groupDelegate);
    }

    function checkIfItemMoveAllowed(args: IsMoveAllowedArgs): boolean {
        const movedItem = groupDelegate.findDescendantById(args.movedItemId);
        if (!movedItem) {
            return false;
        }

        const destinationItem = args.destinationId
            ? groupDelegate.findDescendantById(args.destinationId)
            : props.dataProviderManager;

        if (!destinationItem || !instanceofItemGroup(destinationItem)) {
            return false;
        }

        if (movedItem instanceof View && destinationItem instanceof View) {
            return false;
        }

        if (props.isMoveAllowed) {
            if (!props.isMoveAllowed(movedItem, destinationItem)) {
                return false;
            }
        }

        const numSharedSettings =
            destinationItem.getGroupDelegate().findChildren((item) => {
                return item instanceof SharedSetting;
            }).length ?? 0;

        if (!(movedItem instanceof SharedSetting)) {
            if (args.position < numSharedSettings) {
                return false;
            }
        } else {
            if (args.originId === args.destinationId) {
                if (args.position >= numSharedSettings) {
                    return false;
                }
            } else {
                if (args.position > numSharedSettings) {
                    return false;
                }
            }
        }

        return true;
    }

    function handleItemMoved(
        movedItemId: string,
        originId: string | null,
        destinationId: string | null,
        position: number,
    ) {
        const movedItem = groupDelegate.findDescendantById(movedItemId);
        if (!movedItem) {
            return;
        }

        let origin = props.dataProviderManager.getGroupDelegate();
        if (originId) {
            const candidate = groupDelegate.findDescendantById(originId);
            if (candidate && instanceofItemGroup(candidate)) {
                origin = candidate.getGroupDelegate();
            }
        }

        let destination = props.dataProviderManager.getGroupDelegate();
        if (destinationId) {
            const candidate = groupDelegate.findDescendantById(destinationId);
            if (candidate && instanceofItemGroup(candidate)) {
                destination = candidate.getGroupDelegate();
            }
        }

        if (origin === destination) {
            origin.moveChild(movedItem, position);
            return;
        }

        origin.removeChild(movedItem);
        destination.insertChild(movedItem, position);
    }

    const actions = React.useMemo(() => {
        if (typeof groupActions === "function") {
            return groupActions(props.dataProviderManager);
        }
        return groupActions;
    }, [props.dataProviderManager, groupActions]);

    const makeActionsForGroup = (group: ItemGroup) => {
        if (typeof groupActions === "function") {
            return groupActions(group);
        }
        return groupActions;
    };

    const sharedSettings = sharedSettingsAndOtherItems.sharedSettings;
    const otherItems = sharedSettingsAndOtherItems.otherItems;

    return (
        <div className="grow flex flex-col min-h-0">
            <div className="w-full grow flex flex-col min-h-0" ref={listRef}>
                <div className="flex bg-slate-100 h-12 p-2 items-center border-b border-gray-300 gap-2">
                    <div className="grow font-bold text-sm">{props.title}</div>
                    <Actions actionGroups={actions} onActionClick={handleActionClick} />
                    <ExpandCollapseAllButton group={props.dataProviderManager} />
                    {props.additionalHeaderComponents}
                </div>
                <div
                    className="w-full grow flex flex-col relative"
                    style={{ height: listSize.height - convertRemToPixels(12) }}
                >
                    <SortableList
                        onItemMoved={handleItemMoved}
                        isMoveAllowed={checkIfItemMoveAllowed}
                        className="h-full"
                    >
                        <SortableList.Content>
                            <SortableList.ScrollContainer>
                                <div className="grow overflow-auto min-h-0 border relative h-full pl-4 pr-2 bg-slate-300">
                                    {items.length === 0 && (
                                        <div className="flex -mt-1 justify-center text-sm items-center gap-1 h-40">
                                            Click on <Add fontSize="inherit" /> to add an item.
                                        </div>
                                    )}
                                    <div className="h-auto relative">
                                        {sharedSettings.length > 0 && (
                                            <FixedGroup icon={<Link fontSize="inherit" />} title="Shared Settings">
                                                {sharedSettings.map((setting: Item, index: number) =>
                                                    makeSortableListItemComponent(
                                                        setting,
                                                        index === sharedSettings.length - 1,
                                                        makeActionsForGroup,
                                                        handleActionClick,
                                                    ),
                                                )}
                                            </FixedGroup>
                                        )}
                                        {otherItems.map((item: Item, index: number) =>
                                            makeSortableListItemComponent(
                                                item,
                                                index === otherItems.length - 1,
                                                makeActionsForGroup,
                                                handleActionClick,
                                            ),
                                        )}
                                    </div>
                                </div>
                            </SortableList.ScrollContainer>
                        </SortableList.Content>
                    </SortableList>
                </div>
            </div>
        </div>
    );
}
