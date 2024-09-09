import React from "react";

import { SortableListItem } from "@lib/components/SortableList";

import { SettingComponent } from "./SettingComponent";

import { SharedSetting } from "../SharedSetting";

export type SharedSettingComponentProps = {
    sharedSetting: SharedSetting;
    onRemove: (id: string) => void;
};

export function SharedSettingComponent(props: SharedSettingComponentProps): React.ReactNode {
    const manager = props.sharedSetting.getLayerManager();

    return (
        <SortableListItem
            key={props.sharedSetting.getId()}
            id={props.sharedSetting.getId()}
            title={props.sharedSetting.getName()}
        >
            <SettingComponent
                setting={props.sharedSetting.getWrappedSetting()}
                workbenchSession={manager.getWorkbenchSession()}
                workbenchSettings={manager.getWorkbenchSettings()}
            />
        </SortableListItem>
    );
}
