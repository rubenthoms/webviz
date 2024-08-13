import React from "react";

import { LayerGroup, LayerGroupTopic, useLayerGroupTopicValue } from "@modules/_shared/layers/LayerGroup";
import { Folder, Visibility, VisibilityOff } from "@mui/icons-material";

type LayerGroupStartAdornmentProps = {
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
