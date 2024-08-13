import React from "react";

import { BaseLayer, useIsLayerVisible, useLayerName } from "@modules/_shared/layers/BaseLayer";
import { Visibility, VisibilityOff } from "@mui/icons-material";

type LayerNameProps = {
    layer: BaseLayer<any, any>;
};

export function LayerName(props: LayerNameProps): React.ReactNode {
    const layerName = useLayerName(props.layer);
    const [editingName, setEditingName] = React.useState<boolean>(false);

    function handleNameDoubleClick() {
        setEditingName(true);
    }

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.layer.setName(e.target.value);
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
                    value={layerName}
                    onChange={handleNameChange}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            ) : (
                layerName
            )}
        </div>
    );
}

export type LayerStartAdornmentProps = {
    layer: BaseLayer<any, any>;
};

export function LayerStartAdornment(props: LayerStartAdornmentProps): React.ReactNode {
    const isVisible = useIsLayerVisible(props.layer);

    function handleToggleLayerVisibility() {
        props.layer.setIsVisible(!isVisible);
    }

    return (
        <div
            className="px-0.5 hover:cursor-pointer rounded hover:text-blue-800"
            onClick={handleToggleLayerVisibility}
            title="Toggle visibility"
        >
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </div>
    );
}
