import React from "react";

import { StatusMessage } from "@framework/ModuleInstanceStatusController";
import { CircularProgress } from "@lib/components/CircularProgress";
import { SortableListItem } from "@lib/components/SortableList";
import { Check, Delete, Error, Visibility, VisibilityOff } from "@mui/icons-material";

import { SettingComponent } from "./SettingComponent";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { ItemDelegateTopic } from "../delegates/ItemDelegate";
import { LayerDelegateTopic } from "../delegates/LayerDelegate";
import { Layer, LayerStatus, Setting } from "../interfaces";

export type LayerComponentProps = {
    layer: Layer<any, any>;
    onRemove: (id: string) => void;
};

export function LayerComponent(props: LayerComponentProps): React.ReactNode {
    function makeSetting(setting: Setting<any>) {
        const manager = props.layer.getItemDelegate().getLayerManager();
        if (!manager) {
            return null;
        }
        return (
            <SettingComponent
                key={setting.getDelegate().getId()}
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
        <SortableListItem
            key={props.layer.getItemDelegate().getId()}
            id={props.layer.getItemDelegate().getId()}
            title={props.layer.getItemDelegate().getName()}
            startAdornment={<StartActions layer={props.layer} />}
            endAdornment={<Actions layer={props.layer} />}
        >
            <div className="table">
                {makeSettings(props.layer.getLayerDelegate().getSettingsContext().getDelegate().getSettings())}
            </div>
        </SortableListItem>
    );
}

type ActionProps = {
    layer: Layer<any, any>;
};

function Actions(props: ActionProps): React.ReactNode {
    const status = usePublishSubscribeTopicValue(props.layer.getLayerDelegate(), LayerDelegateTopic.STATUS);

    function handleRemove() {
        props.layer.getItemDelegate().getParentGroup()?.removeChild(props.layer);
    }

    function makeStatus(): React.ReactNode {
        if (status === LayerStatus.LOADING) {
            return (
                <div title="Loading">
                    <CircularProgress size="extra-small" />
                </div>
            );
        }
        if (status === LayerStatus.ERROR) {
            const error = props.layer.getLayerDelegate().getError();
            if (typeof error === "string") {
                return (
                    <div title={error}>
                        <Error fontSize="inherit" className="text-red-700" />
                    </div>
                );
            } else {
                const statusMessage = error as StatusMessage;
                return (
                    <div title={statusMessage.message}>
                        <Error fontSize="inherit" className="text-red-700" />
                    </div>
                );
            }
        }
        if (status === LayerStatus.SUCCESS) {
            return (
                <div title="Successfully loaded">
                    <Check fontSize="inherit" className="text-green-700" />
                </div>
            );
        }
        return null;
    }

    return (
        <>
            {makeStatus()}
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

type StartActionsProps = {
    layer: Layer<any, any>;
};

function StartActions(props: StartActionsProps): React.ReactNode {
    const isVisible = usePublishSubscribeTopicValue(props.layer.getItemDelegate(), ItemDelegateTopic.VISIBILITY);

    function handleToggleLayerVisibility() {
        props.layer.getItemDelegate().setIsVisible(!isVisible);
    }

    return (
        <div
            className="hover:cursor-pointer rounded hover:text-blue-800"
            onClick={handleToggleLayerVisibility}
            title="Toggle visibility"
        >
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </div>
    );
}
