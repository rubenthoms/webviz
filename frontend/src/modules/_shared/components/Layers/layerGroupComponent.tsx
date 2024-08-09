import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { useElementBoundingRect } from "@lib/hooks/useElementBoundingRect";
import { createPortal } from "@lib/utils/createPortal";
import { resolveClassNames } from "@lib/utils/resolveClassNames";
import { Vec2 } from "@lib/utils/vec2";
import { LayerGroup, LayerGroupTopic, useLayerGroupTopicValue } from "@modules/_shared/layers/LayerGroup";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { Dropdown, MenuButton } from "@mui/base";
import {
    Add,
    ArrowDropDown,
    Delete,
    DragIndicator,
    ExpandLess,
    ExpandMore,
    Folder,
    Visibility,
    VisibilityOff,
} from "@mui/icons-material";

import { MakeSettingsContainerFunc } from "./layersPanel";

export type LayerGroupProps<TLayerType extends string> = {
    group: LayerGroup;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    layerManager: LayerManager;
    layerTypeToStringMapping: Record<TLayerType, string>;
    isDragging: boolean;
    dragPosition: Vec2;
    draggingLayerId: string | null;
    onRemoveGroup: (id: string) => void;
    onAddLayer: (type: TLayerType, groupId: string) => void;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    children: React.ReactNode[];
};

export function LayerGroupComponent<TLayerType extends string>(props: LayerGroupProps<TLayerType>): React.ReactNode {
    const [showChildren, setShowChildren] = React.useState<boolean>(true);

    const dragIndicatorRef = React.useRef<HTMLDivElement>(null);
    const divRef = React.useRef<HTMLDivElement>(null);

    const boundingClientRect = useElementBoundingRect(divRef);

    const layers = props.layerManager.getLayersInGroup(props.group.getId());
    const isVisible = layers.every((layer) => layer.getIsVisible());

    function handleRemoveGroup() {
        props.onRemoveGroup(props.group.getId());
    }

    function handleAddLayer(type: TLayerType) {
        props.onAddLayer(type, props.group.getId());
    }

    function handleToggleLayerVisibility() {
        const layers = props.layerManager.getLayersInGroup(props.group.getId());
        const visible = layers.every((layer) => layer.getIsVisible());
        if (visible) {
            layers.forEach((layer) => layer.setIsVisible(false));
            return;
        }
        layers.forEach((layer) => layer.setIsVisible(true));
    }

    function handleToggleChildrenVisibility() {
        setShowChildren(!showChildren);
    }

    function makeGroupElement(indicatorRef?: React.LegacyRef<HTMLDivElement>): React.ReactNode {
        return (
            <>
                <div
                    className={resolveClassNames("px-0.5", {
                        "hover:cursor-grab": !props.isDragging,
                        "hover:cursor-grabbing": props.isDragging,
                    })}
                    data-item-id={props.group.getId()}
                    data-item-type="group"
                    ref={indicatorRef}
                >
                    <DragIndicator fontSize="inherit" className="pointer-events-none" />
                </div>
                <div
                    className="hover:cursor-pointer hover:text-blue-800 p-0.5 rounded"
                    onClick={handleToggleChildrenVisibility}
                    title={showChildren ? "Hide children" : "Show children"}
                >
                    {showChildren ? <ExpandLess fontSize="inherit" /> : <ExpandMore fontSize="inherit" />}
                </div>
                <Folder fontSize="inherit" />
                <div
                    className={resolveClassNames("px-0.5 hover:cursor-pointer rounded", {
                        "hover:text-blue-800": !props.isDragging,
                    })}
                    onClick={handleToggleLayerVisibility}
                    title="Toggle visibility"
                >
                    {isVisible ? <Visibility fontSize="inherit" /> : <VisibilityOff fontSize="inherit" />}
                </div>
                <GroupName group={props.group} />
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
                <div
                    className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded"
                    onClick={handleRemoveGroup}
                    title="Remove layer"
                >
                    <Delete fontSize="inherit" />
                </div>
            </>
        );
    }

    return (
        <div
            ref={divRef}
            className={resolveClassNames("relative")}
            data-item-id={props.group.getId()}
            data-item-type="group"
        >
            <div
                className={resolveClassNames("bg-blue-300 z-30 w-full h-full absolute left-0 top-0", {
                    hidden: !props.isDragging,
                })}
            ></div>
            <div className="flex h-8 py-1 px-1 hover:bg-blue-100 text-sm items-center gap-1 border-b border-b-gray-300 relative bg-white">
                {makeGroupElement(dragIndicatorRef)}
            </div>
            {props.isDragging &&
                createPortal(
                    <div
                        className={resolveClassNames(
                            "flex h-10 px-1 hover:bg-blue-50 text-sm items-center gap-1 border-b border-b-gray-300 absolute z-50"
                        )}
                        style={{
                            left: props.dragPosition.x,
                            top: props.dragPosition.y,
                            width: props.isDragging ? boundingClientRect.width : undefined,
                        }}
                    >
                        {makeGroupElement()}
                    </div>
                )}
            <div
                className={resolveClassNames(
                    "layer-container border-b border-b-gray-300 bg-blue-300 shadow-inner pl-1",
                    {
                        "overflow-hidden h-[1px]": !showChildren,
                    }
                )}
            >
                {props.children}
                {props.children.length === 0 && (
                    <div className="text-sm p-1" data-item-type="group-placeholder">
                        No layers
                    </div>
                )}
            </div>
        </div>
    );
}

type LayerNameProps = {
    group: LayerGroup;
};

function GroupName(props: LayerNameProps): React.ReactNode {
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
