import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { SortableList, SortableListGroup, SortableListItem, SortableListItemProps } from "@lib/components/SortableList";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import {
    LayerManager,
    LayerManagerItem,
    LayerManagerTopic,
    useLayerManagerTopicValue,
} from "@modules/_shared/layers/LayerManager";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown, CreateNewFolder } from "@mui/icons-material";

import { isEqual } from "lodash";

import { LayerName, LayerStartAdornment } from "./layerComponents";
import { LayerGroupName, LayerGroupStartAdornment } from "./layerGroupComponents";

export interface LayerFactory<TLayerType extends string> {
    makeLayer(layerType: TLayerType): BaseLayer<any, any>;
}

export interface MakeSettingsContainerFunc {
    (
        layer: BaseLayer<any, any>,
        ensembleSet: EnsembleSet,
        workbenchSession: WorkbenchSession,
        workbenchSettings: WorkbenchSettings
    ): React.ReactNode;
}

export type LayersPanelProps<TLayerType extends string> = {
    ensembleSet: EnsembleSet;
    layerManager: LayerManager;
    layerFactory: LayerFactory<TLayerType>;
    layerTypeToStringMapping: Record<TLayerType, string>;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    allowGroups?: boolean;
};

export function LayersPanel<TLayerType extends string>(props: LayersPanelProps<TLayerType>): React.ReactNode {
    const items = useLayerManagerTopicValue(props.layerManager, LayerManagerTopic.ITEMS_CHANGED);

    const [prevItems, setPrevItems] = React.useState<LayerManagerItem[]>(items);
    const [itemsOrder, setItemsOrder] = React.useState<string[]>(items.map((item) => item.getId()));

    if (!isEqual(prevItems, items)) {
        setPrevItems(items);
        setItemsOrder(items.map((layer) => layer.getId()));
    }

    function handleAddLayer(type: TLayerType, group?: LayerGroup) {
        if (group) {
            group.addLayer(props.layerFactory.makeLayer(type));
            return;
        }
        props.layerManager.addLayer(props.layerFactory.makeLayer(type));
    }

    function handleAddGroup() {
        props.layerManager.addGroup("Group");
    }

    function handleRemoveGroup(id: string) {
        props.layerManager.removeGroup(id);
    }

    function handleRemoveItem(id: string) {
        props.layerManager.removeLayer(id);
    }

    function handleItemMove(itemId: string, originId: string | null, destinationId: string | null, position: number) {
        let origin: LayerGroup | LayerManager | null = props.layerManager;
        if (originId) {
            origin = props.layerManager.getGroup(originId) ?? null;
        }

        let destination: LayerGroup | LayerManager | null = props.layerManager;
        if (destinationId) {
            destination = props.layerManager.getGroup(destinationId) ?? null;
        }

        if (origin === null || destination === null) {
            return;
        }

        let isLayer: boolean = true;
        let item: BaseLayer<any, any> | LayerGroup | undefined = origin.getLayer(itemId);

        if (!item && origin instanceof LayerManager) {
            item = origin.getGroup(itemId);
            isLayer = false;
        }

        if (!item) {
            return;
        }

        if (isLayer) {
            origin.removeLayer(itemId);
        } else if (origin instanceof LayerManager) {
            origin.removeGroup(itemId);
        }

        if (isLayer && item instanceof BaseLayer) {
            destination.insertLayer(item, position);
        } else if (destination instanceof LayerManager && item instanceof LayerGroup) {
            destination.insertGroup(item, position);
        }
    }

    function makeLayerElement(layer: BaseLayer<any, any>): React.ReactElement<SortableListItemProps> {
        return (
            <SortableListItem
                key={layer.getId()}
                id={layer.getId()}
                title={<LayerName layer={layer} />}
                startAdornment={<LayerStartAdornment layer={layer} />}
            >
                {props.makeSettingsContainerFunc(
                    layer,
                    props.ensembleSet,
                    props.workbenchSession,
                    props.workbenchSettings
                )}
            </SortableListItem>
        );
    }

    function makeLayerGroup(group: LayerGroup): React.ReactElement<SortableListItemProps> {
        return (
            <SortableListGroup
                key={group.getId()}
                id={group.getId()}
                title={<LayerGroupName group={group} />}
                startAdornment={<LayerGroupStartAdornment group={group} />}
            >
                {group.getLayers().map((layer) => makeLayerElement(layer))}
            </SortableListGroup>
        );
    }
    function makeLayersAndGroupsContent(): React.ReactElement<SortableListItemProps>[] {
        const nodes: React.ReactElement<SortableListItemProps>[] = [];

        const orderedItems = itemsOrder
            .map((id) => items.find((el) => el.getId() === id))
            .filter((el) => el) as LayerManagerItem[];

        for (let i = 0; i < orderedItems.length; i++) {
            const item = orderedItems[i];

            if (item instanceof LayerGroup) {
                nodes.push(makeLayerGroup(item));
            } else {
                nodes.push(makeLayerElement(item as BaseLayer<any, any>));
            }
        }

        return nodes;
    }

    return (
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                <div className="flex-grow font-bold text-sm">Layers</div>
                {props.allowGroups && (
                    <div
                        className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2"
                        onClick={handleAddGroup}
                    >
                        <CreateNewFolder fontSize="inherit" />
                        <span>Add group</span>
                    </div>
                )}
                <Dropdown>
                    <MenuButton>
                        <div className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2">
                            <Add fontSize="inherit" />
                            <span>Add layer</span>
                            <ArrowDropDown fontSize="inherit" />
                        </div>
                    </MenuButton>
                    <Menu anchorOrigin="bottom-end" className="text-sm p-1">
                        {Object.keys(props.layerTypeToStringMapping).map((layerType, index) => {
                            return (
                                <MenuItem
                                    key={index}
                                    className="text-sm p-0.5"
                                    onClick={() => handleAddLayer(layerType as TLayerType)}
                                >
                                    {props.layerTypeToStringMapping[layerType as TLayerType]}
                                </MenuItem>
                            );
                        })}
                    </Menu>
                </Dropdown>
            </div>
            <div className="w-full flex-grow flex flex-col relative">
                <SortableList
                    contentWhenEmpty={
                        <div className="flex h-full -mt-1 justify-center text-sm items-center gap-1">
                            Click on <Add fontSize="inherit" /> to add a layer.
                        </div>
                    }
                    onItemMove={handleItemMove}
                >
                    {makeLayersAndGroupsContent()}
                </SortableList>
            </div>
        </div>
    );
}
