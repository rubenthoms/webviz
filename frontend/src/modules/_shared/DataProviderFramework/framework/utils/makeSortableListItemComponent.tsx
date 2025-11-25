import type { ActionGroup } from "../../Actions";
import type { Item, ItemGroup } from "../../interfacesAndTypes/entities";
import { isDataProvider } from "../DataProvider/DataProvider";
import { DataProviderComponent } from "../DataProvider/DataProviderComponent";
import { DeltaSurface } from "../DeltaSurface/DeltaSurface";
import { DeltaSurfaceComponent } from "../DeltaSurface/DeltaSurfaceComponent";
import { isGroup } from "../Group/Group";
import { GroupComponent } from "../Group/GroupComponent";
import { isSettingsGroup } from "../SettingsGroup/SettingsGroup";
import { SettingsGroupComponent } from "../SettingsGroup/SettingsGroupComponent";
import { isSharedSetting } from "../SharedSetting/SharedSetting";
import { SharedSettingComponent } from "../SharedSetting/SharedSettingComponent";

export function makeSortableListItemComponent(
    item: Item,
    lastItem: boolean,
    makeActionsForGroup: (group: ItemGroup) => ActionGroup[],
    onActionClick?: (identifier: string, group: ItemGroup) => void,
    nestingLevel?: number,
): React.ReactElement {
    const level = nestingLevel ?? 0;

    if (isDataProvider(item)) {
        return (
            <DataProviderComponent
                key={item.getItemDelegate().getId()}
                dataProvider={item}
                isLastItemInParent={lastItem}
                nestingLevel={level}
            />
        );
    }
    if (isSettingsGroup(item)) {
        return (
            <SettingsGroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
                isLastItemInParent={lastItem}
                nestingLevel={level}
            />
        );
    }
    if (isGroup(item)) {
        return (
            <GroupComponent
                key={item.getItemDelegate().getId()}
                group={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
                isLastItemInParent={lastItem}
                nestingLevel={level}
            />
        );
    }
    if (item instanceof DeltaSurface) {
        return (
            <DeltaSurfaceComponent
                key={item.getItemDelegate().getId()}
                deltaSurface={item}
                makeActionsForGroup={makeActionsForGroup}
                onActionClick={onActionClick}
                isLastItemInParent={lastItem}
                nestingLevel={level}
            />
        );
    }
    if (isSharedSetting(item)) {
        return (
            <SharedSettingComponent
                key={item.getItemDelegate().getId()}
                sharedSetting={item}
                isLastItemInParent={lastItem}
                nestingLevel={level}
            />
        );
    }

    throw new Error(`Unsupported item type: ${item.constructor.name}`);
}
