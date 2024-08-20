import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListItemProps } from "@lib/components/SortableList";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import { LayerItem, LayerManager } from "@modules/_shared/layers/LayerManager";
import { BaseSetting } from "@modules/_shared/layers/settings/BaseSetting";

import { LayerSettingContentFactory } from "./LayerSettingContentFactory";
import { LayerComponent } from "./layerComponents";
import { LayerGroupComponent } from "./layerGroupComponents";
import { LayerFactory, MakeSettingsContainerFunc } from "./layersPanel";
import { LayerSettingComponent } from "./settingComponents";

function makeLayerElement(
    layer: BaseLayer<any, any>,
    handleRemoveItem: (id: string) => void,
    makeSettingsContainerFunc: MakeSettingsContainerFunc,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactElement<SortableListItemProps> {
    return (
        <LayerComponent
            key={layer.getId()}
            layer={layer}
            onRemove={handleRemoveItem}
            makeSettingsContainerFunc={makeSettingsContainerFunc}
            ensembleSet={ensembleSet}
            workbenchSession={workbenchSession}
            workbenchSettings={workbenchSettings}
        />
    );
}

function makeLayerGroup<TLayerType extends string>(
    group: LayerGroup,
    layerManager: LayerManager,
    icon: React.ReactNode,
    layerFactory: LayerFactory<TLayerType>,
    layerTypeToStringMapping: Record<TLayerType, string>,
    handleRemoveItem: (id: string) => void,
    makeSettingsContainerFunc: MakeSettingsContainerFunc,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactElement {
    return (
        <LayerGroupComponent
            key={group.getId()}
            layerManager={layerManager}
            group={group}
            icon={icon}
            layerFactory={layerFactory}
            layerTypeToStringMapping={layerTypeToStringMapping}
            onRemove={handleRemoveItem}
            makeSettingsContainerFunc={makeSettingsContainerFunc}
            ensembleSet={ensembleSet}
            workbenchSession={workbenchSession}
            workbenchSettings={workbenchSettings}
        />
    );
}

function makeSettingElement(
    setting: BaseSetting<any>,
    handleRemoveItem: (id: string) => void,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactElement<SortableListItemProps> {
    const layerSettingFactory = new LayerSettingContentFactory(ensembleSet, workbenchSession, workbenchSettings);
    return (
        <LayerSettingComponent key={setting.getId()} setting={setting} onRemove={handleRemoveItem}>
            {layerSettingFactory.createLayerSetting(setting)}
        </LayerSettingComponent>
    );
}

export function makeContent<TLayerType extends string>(
    items: LayerItem[],
    layerManager: LayerManager,
    icon: React.ReactNode,
    layerFactory: LayerFactory<TLayerType>,
    layerTypeToStringMapping: Record<TLayerType, string>,
    handleRemoveItem: (id: string) => void,
    makeSettingsContainerFunc: MakeSettingsContainerFunc,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactElement<SortableListItemProps>[] {
    const nodes: React.ReactElement<SortableListItemProps>[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item instanceof LayerGroup) {
            nodes.push(
                makeLayerGroup(
                    item,
                    layerManager,
                    icon,
                    layerFactory,
                    layerTypeToStringMapping,
                    handleRemoveItem,
                    makeSettingsContainerFunc,
                    ensembleSet,
                    workbenchSession,
                    workbenchSettings
                )
            );
        } else if (item instanceof BaseLayer) {
            nodes.push(
                makeLayerElement(
                    item as BaseLayer<any, any>,
                    handleRemoveItem,
                    makeSettingsContainerFunc,
                    ensembleSet,
                    workbenchSession,
                    workbenchSettings
                )
            );
        } else if (item instanceof BaseSetting) {
            nodes.push(
                makeSettingElement(
                    item as BaseSetting<any>,
                    handleRemoveItem,
                    ensembleSet,
                    workbenchSession,
                    workbenchSettings
                )
            );
        }
    }

    return nodes;
}
