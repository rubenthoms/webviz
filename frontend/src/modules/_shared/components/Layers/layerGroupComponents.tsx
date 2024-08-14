import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListGroup } from "@lib/components/SortableList";
import { LayerGroup, LayerGroupTopic, useLayerGroupTopicValue } from "@modules/_shared/layers/LayerGroup";
import { Delete, Folder, Visibility, VisibilityOff } from "@mui/icons-material";

import { AddLayerDropdown } from "./addLayerDropdown";
import { LayerComponent } from "./layerComponents";
import { LayerFactory, MakeSettingsContainerFunc } from "./layersPanel";

export type LayerGroupComponentProps<TLayerType extends string> = {
    group: LayerGroup;
    layerFactory: LayerFactory<TLayerType>;
    layerTypeToStringMapping: Record<string, string>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    onRemove: (groupId: string) => void;
};

export function LayerGroupComponent<TLayerType extends string>(
    props: LayerGroupComponentProps<TLayerType>
): React.ReactNode {
    const layers = useLayerGroupTopicValue(props.group, LayerGroupTopic.LAYERS_CHANGED);

    function handleRemoveLayer(layerId: string) {
        props.group.removeLayer(layerId);
    }

    return (
        <SortableListGroup
            key={props.group.getId()}
            id={props.group.getId()}
            title={<LayerGroupName group={props.group} />}
            startAdornment={<LayerGroupStartAdornment group={props.group} />}
            endAdornment={
                <LayerGroundEndAdornment
                    group={props.group}
                    onRemove={props.onRemove}
                    layerFactory={props.layerFactory}
                    layerTypeToStringMapping={props.layerTypeToStringMapping}
                />
            }
            contentWhenEmpty={<div className="text-sm p-1.5">No layers</div>}
        >
            {layers.map((layer) => (
                <LayerComponent
                    key={layer.getId()}
                    layer={layer}
                    onRemove={handleRemoveLayer}
                    makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                    ensembleSet={props.ensembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            ))}
        </SortableListGroup>
    );
}

export type LayerGroupStartAdornmentProps = {
    group: LayerGroup;
};

export function LayerGroupStartAdornment(props: LayerGroupStartAdornmentProps): React.ReactNode {
    const isVisible = useLayerGroupTopicValue(props.group, LayerGroupTopic.VISIBILITY_CHANGED);

    function handleToggleLayerVisibility() {
        props.group.setIsVisible(!isVisible);
    }

    return (
        <>
            <Folder fontSize="inherit" />
            <div
                className="px-0.5 hover:cursor-pointer rounded hover:text-blue-800"
                onClick={handleToggleLayerVisibility}
                title="Toggle visibility"
            >
                {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
            </div>
        </>
    );
}

export type LayerGroundEndAdornmentProps<TLayerType extends string> = {
    group: LayerGroup;
    layerTypeToStringMapping: Record<string, string>;
    layerFactory: LayerFactory<TLayerType>;
    onRemove: (groupId: string) => void;
};

export function LayerGroundEndAdornment<TLayerType extends string>(
    props: LayerGroundEndAdornmentProps<TLayerType>
): React.ReactNode {
    function handleRemoveLayerGroup() {
        props.onRemove(props.group.getId());
    }

    return (
        <>
            <AddLayerDropdown
                parent={props.group}
                layerFactory={props.layerFactory}
                layerTypeToStringMapping={props.layerTypeToStringMapping}
            />
            <div
                className="hover:cursor-pointer rounded hover:text-red-800"
                onClick={handleRemoveLayerGroup}
                title="Remove layer group"
            >
                <Delete fontSize="inherit" />
            </div>
        </>
    );
}

type LayerNameProps = {
    group: LayerGroup;
};

export function LayerGroupName(props: LayerNameProps): React.ReactNode {
    const groupName = useLayerGroupTopicValue(props.group, LayerGroupTopic.NAME_CHANGED);
    const [editingName, setEditingName] = React.useState<boolean>(false);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.group.setName(e.target.value);
    }

    function handleBlur() {
        setEditingName(false);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            setEditingName(false);
        }
    }

    return (
        <div
            className="flex-grow font-bold flex items-center pt-1"
            onDoubleClick={handleNameDoubleClick}
            title="Double-click to edit name"
        >
            {editingName ? (
                <input
                    type="text"
                    className="p-0.5 w-full"
                    value={groupName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                groupName
            )}
        </div>
    );
}
