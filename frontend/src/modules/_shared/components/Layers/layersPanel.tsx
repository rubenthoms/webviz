import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { IsMoveAllowedArgs, ItemType, SortableList, SortableListItemProps } from "@lib/components/SortableList";
import { BaseItem } from "@modules/_shared/layers/BaseItem";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import {
    LayerItem,
    LayerManager,
    LayerManagerTopic,
    useLayerManagerTopicValue,
} from "@modules/_shared/layers/LayerManager";
import { BaseSetting } from "@modules/_shared/layers/settings/BaseSetting";
import { Add } from "@mui/icons-material";

import { isEqual } from "lodash";

import { LayerSettingContentFactory } from "./LayerSettingContentFactory";
import { LayerComponent } from "./layerComponents";
import { LayerGroupComponent } from "./layerGroupComponents";
import { LayerSettingComponent } from "./settingComponents";

export interface LayerFactory<TLayerType extends string> {
    makeLayer(layerType: TLayerType, layerManager: LayerManager): BaseLayer<any, any>;
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
    title: string;
    ensembleSet: EnsembleSet;
    layerManager: LayerManager;
    layerFactory: LayerFactory<TLayerType>;
    layerTypeToStringMapping: Record<TLayerType, string>;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    actions?: React.ReactNode;
    groupIcon?: React.ReactNode;
};

export function LayersPanel<TLayerType extends string>(props: LayersPanelProps<TLayerType>): React.ReactNode {
    const items = useLayerManagerTopicValue(props.layerManager, LayerManagerTopic.ITEMS_CHANGED);
    const layerSettingFactory = new LayerSettingContentFactory(
        props.ensembleSet,
        props.workbenchSession,
        props.workbenchSettings
    );

    const [prevItems, setPrevItems] = React.useState<BaseItem[]>(items);
    const [itemsOrder, setItemsOrder] = React.useState<string[]>(items.map((item) => item.getId()));

    if (!isEqual(prevItems, items)) {
        setPrevItems(items);
        setItemsOrder(items.map((layer) => layer.getId()));
    }

    function handleRemoveItem(id: string) {
        props.layerManager.getMainGroup().removeItem(id);
    }

    function handleItemMove(itemId: string, originId: string | null, destinationId: string | null, position: number) {
        let origin: LayerGroup | null = props.layerManager.getMainGroup();
        if (originId) {
            const candidate = props.layerManager.getMainGroup().getSubGroup(originId);
            if (candidate instanceof LayerGroup) {
                origin = candidate;
            }
        }

        let destination: LayerGroup | null = props.layerManager.getMainGroup();
        if (destinationId) {
            const candidate = props.layerManager.getMainGroup().getItem(destinationId);
            if (candidate instanceof LayerGroup) {
                destination = candidate;
            }
        }

        if (origin === null || destination === null) {
            return;
        }

        const item = origin.getItem(itemId);

        if (!item) {
            return;
        }

        origin.removeItem(itemId);
        destination.insertItem(item, position);
    }

    function makeLayerElement(layer: BaseLayer<any, any>): React.ReactElement<SortableListItemProps> {
        return (
            <LayerComponent
                key={layer.getId()}
                layer={layer}
                onRemove={handleRemoveItem}
                makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                ensembleSet={props.ensembleSet}
                workbenchSession={props.workbenchSession}
                workbenchSettings={props.workbenchSettings}
            />
        );
    }

    function makeLayerGroup(group: LayerGroup): React.ReactElement {
        return (
            <LayerGroupComponent
                key={group.getId()}
                layerManager={props.layerManager}
                group={group}
                icon={props.groupIcon}
                layerFactory={props.layerFactory}
                layerTypeToStringMapping={props.layerTypeToStringMapping}
                onRemove={handleRemoveItem}
                makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                ensembleSet={props.ensembleSet}
                workbenchSession={props.workbenchSession}
                workbenchSettings={props.workbenchSettings}
            />
        );
    }

    function makeSettingElement(setting: BaseSetting<any>): React.ReactElement<SortableListItemProps> {
        return (
            <LayerSettingComponent key={setting.getId()} setting={setting} onRemove={handleRemoveItem}>
                {layerSettingFactory.createLayerSetting(setting)}
            </LayerSettingComponent>
        );
    }

    function makeContent(): React.ReactElement<SortableListItemProps>[] {
        const nodes: React.ReactElement<SortableListItemProps>[] = [];

        const orderedItems = itemsOrder
            .map((id) => items.find((el) => el.getId() === id))
            .filter((el) => el) as LayerItem[];

        for (let i = 0; i < orderedItems.length; i++) {
            const item = orderedItems[i];

            if (item instanceof LayerGroup) {
                nodes.push(makeLayerGroup(item));
            } else if (item instanceof BaseLayer) {
                nodes.push(makeLayerElement(item as BaseLayer<any, any>));
            } else if (item instanceof BaseSetting) {
                nodes.push(makeSettingElement(item as BaseSetting<any>));
            }
        }

        return nodes;
    }

    function isMoveAllowed(args: IsMoveAllowedArgs): boolean {
        if (args.movedItemType === ItemType.GROUP && args.destinationType === ItemType.GROUP) {
            return false;
        }
        return true;
    }

    return (
        <div className="w-full flex-grow flex flex-col min-h-0 max-h-full">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                <div className="flex-grow font-bold text-sm">{props.title}</div>
                {props.actions}
            </div>
            <div className="w-full flex-grow flex flex-col relative min-h-0">
                <SortableList
                    contentWhenEmpty={
                        <div className="flex h-full -mt-1 justify-center text-sm items-center gap-1">
                            Click on <Add fontSize="inherit" /> to add a layer.
                        </div>
                    }
                    onItemMoved={handleItemMove}
                    isMoveAllowed={isMoveAllowed}
                >
                    {makeContent()}
                </SortableList>
            </div>
        </div>
    );
}
