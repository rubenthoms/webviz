import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListItem } from "@lib/components/SortableList";
import { BaseLayer, useIsLayerVisible, useLayerName } from "@modules/_shared/layers/BaseLayer";
import { Delete, ExpandLess, ExpandMore, Settings, Visibility, VisibilityOff } from "@mui/icons-material";

import { MakeSettingsContainerFunc } from "./layersPanel";

export type LayerComponentProps = {
    layer: BaseLayer<any, any>;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    onRemove: (id: string) => void;
};

export function LayerComponent(props: LayerComponentProps): React.ReactNode {
    const [isContentVisible, setIsContentVisible] = React.useState<boolean>(true);

    function handleToggleContentVisibility() {
        setIsContentVisible(!isContentVisible);
    }

    return (
        <SortableListItem
            key={props.layer.getId()}
            id={props.layer.getId()}
            title={<LayerName layer={props.layer} />}
            startAdornment={<LayerStartAdornment layer={props.layer} />}
            endAdornment={
                <>
                    <div
                        className="hover:cursor-pointer rounded hover:text-blue-800"
                        onClick={handleToggleContentVisibility}
                        title={isContentVisible ? "Hide settings" : "Show settings"}
                    >
                        <Settings fontSize="inherit" />
                        {isContentVisible ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                    </div>
                    <div
                        className="hover:cursor-pointer rounded hover:text-red-800"
                        onClick={() => props.onRemove(props.layer.getId())}
                        title="Remove layer"
                    >
                        <Delete fontSize="inherit" />
                    </div>
                </>
            }
        >
            <div className={isContentVisible ? "" : "hidden"}>
                {props.makeSettingsContainerFunc(
                    props.layer,
                    props.ensembleSet,
                    props.workbenchSession,
                    props.workbenchSettings
                )}
            </div>
        </SortableListItem>
    );
}

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
            className="hover:cursor-pointer rounded hover:text-blue-800"
            onClick={handleToggleLayerVisibility}
            title="Toggle visibility"
        >
            {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
        </div>
    );
}
