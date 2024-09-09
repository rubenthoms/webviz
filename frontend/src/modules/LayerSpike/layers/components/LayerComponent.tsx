import React from "react";

import { SortableListItem } from "@lib/components/SortableList";

import { SettingComponent } from "./SettingComponent";

import { Layer, Setting } from "../interfaces";

export type LayerComponentProps = {
    layer: Layer<any>;
    onRemove: (id: string) => void;
};

export function LayerComponent(props: LayerComponentProps): React.ReactNode {
    function makeSetting(setting: Setting<any>) {
        const manager = props.layer.getLayerDelegate().getLayerManager();
        return (
            <SettingComponent
                key={setting.toString()}
                setting={setting}
                workbenchSession={manager.getWorkbenchSession()}
                workbenchSettings={manager.getWorkbenchSettings()}
            />
        );
    }

    function makeSettings(settings: Record<string, Setting<any>>): React.ReactNode[] {
        const settingNodes: React.ReactNode[] = [];
        for (const key of Object.keys(settings)) {
            settingNodes.push(makeSetting(settings[key]));
        }
        return settingNodes;
    }

    return (
        <SortableListItem key={props.layer.getId()} id={props.layer.getId()} title={props.layer.getName()}>
            <div className="table">{makeSettings(props.layer.getSettingsContext().getSettings())}</div>
        </SortableListItem>
    );
}
