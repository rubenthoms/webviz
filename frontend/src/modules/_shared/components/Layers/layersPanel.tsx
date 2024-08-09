import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Menu } from "@lib/components/Menu";
import { MenuItem } from "@lib/components/MenuItem";
import { createPortal } from "@lib/utils/createPortal";
import { MANHATTAN_LENGTH, rectContainsPoint } from "@lib/utils/geometry";
import { Vec2, point2Distance } from "@lib/utils/vec2";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";
import { LayerGroup } from "@modules/_shared/layers/LayerGroup";
import {
    LayerManager,
    LayerManagerItem,
    LayerManagerTopic,
    useLayerManagerTopicValue,
} from "@modules/_shared/layers/LayerManager";
import { Dropdown, MenuButton } from "@mui/base";
import { Add, ArrowDropDown, CreateNewFolder } from "@mui/icons-material";

import { isEqual } from "lodash";

import { LayerComponent } from "./layerComponent";
import { LayerGroupComponent } from "./layerGroupComponent";

export interface LayerFactory<TLayerType extends string> {
    makeLayer(layerType: TLayerType): BaseLayer<any, any>;
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
    ensembleSet: EnsembleSet;
    layerManager: LayerManager;
    layerFactory: LayerFactory<TLayerType>;
    layerTypeToStringMapping: Record<TLayerType, string>;
    makeSettingsContainerFunc: MakeSettingsContainerFunc;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
    allowGroups?: boolean;
};

export function LayersPanel<TLayerType extends string>(props: LayersPanelProps<TLayerType>): React.ReactNode {
    const items = useLayerManagerTopicValue(props.layerManager, LayerManagerTopic.ITEMS_CHANGED);

    const [draggingLayerId, setDraggingLayerId] = React.useState<string | null>(null);
    const [isDragging, setIsDragging] = React.useState<boolean>(false);
    const [dragPosition, setDragPosition] = React.useState<Vec2>({ x: 0, y: 0 });
    const [prevItems, setPrevItems] = React.useState<LayerManagerItem[]>(items);
    const [currentScrollPosition, setCurrentScrollPosition] = React.useState<number>(0);
    const [itemsOrder, setItemsOrder] = React.useState<string[]>(items.map((item) => item.getId()));

    const parentDivRef = React.useRef<HTMLDivElement>(null);
    const scrollDivRef = React.useRef<HTMLDivElement>(null);
    const upperScrollDivRef = React.useRef<HTMLDivElement>(null);
    const lowerScrollDivRef = React.useRef<HTMLDivElement>(null);

    if (!isEqual(prevItems, items)) {
        setPrevItems(items);
        setItemsOrder(items.map((layer) => layer.getId()));
        if (scrollDivRef.current) {
            scrollDivRef.current.scrollTop = currentScrollPosition;
        }
    }

    function handleAddLayer(type: TLayerType, groupId?: string) {
        if (groupId) {
            props.layerManager.addLayerToGroup(props.layerFactory.makeLayer(type), groupId);
            return;
        }
        props.layerManager.addLayer(props.layerFactory.makeLayer(type));
    }

    function handleAddGroup() {
        props.layerManager.addGroup("Group");
    }

    function handleRemoveGroup(id: string) {
        props.layerManager.removeGroup(id);
    }

    function handleRemoveItem(id: string) {
        props.layerManager.removeLayer(id);
    }

    React.useEffect(
        function handleMount() {
            if (parentDivRef.current === null) {
                return;
            }

            const currentParentDivRef = parentDivRef.current;

            let pointerDownPosition: Vec2 | null = null;
            let pointerDownPositionRelativeToElement: Vec2 = { x: 0, y: 0 };
            let draggingActive: boolean = false;
            let itemId: string | null = null;
            let itemType: string | null = null;
            let newLayerOrder: string[] = items.map((layer) => layer.getId());

            let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
            let doScroll: boolean = false;
            let currentScrollTime = 100;

            function findItemElement(element: HTMLElement): [HTMLElement | null, string | null, string | null] {
                if (element?.parentElement && element.dataset.itemId && element.dataset.itemType) {
                    return [element.parentElement, element.dataset.itemId, element.dataset.itemType];
                }
                return [null, null, null];
            }

            function handlePointerDown(e: PointerEvent) {
                const [element, id, type] = findItemElement(e.target as HTMLElement);

                if (!element || !id || !type) {
                    return;
                }

                draggingActive = false;
                setIsDragging(true);
                itemId = id;
                itemType = type;
                pointerDownPosition = { x: e.clientX, y: e.clientY };
                pointerDownPositionRelativeToElement = {
                    x: e.clientX - element.getBoundingClientRect().left,
                    y: e.clientY - element.getBoundingClientRect().top,
                };
                document.addEventListener("pointermove", handlePointerMove);
                document.addEventListener("pointerup", handlePointerUp);
            }

            function moveLayerToIndex(id: string, moveToIndex: number, isLayer: boolean, groupId?: string) {
                const layer = items.find((layer) => layer.getId() === id);
                if (!layer) {
                    return;
                }

                const index = newLayerOrder.indexOf(layer.getId());
                if (index === moveToIndex) {
                    if (!groupId && isLayer) {
                        props.layerManager.setLayerGroupId(id, undefined);
                    }
                    if (groupId && isLayer) {
                        props.layerManager.setLayerGroupId(id, groupId);
                    }
                    return;
                }

                if (moveToIndex <= 0) {
                    newLayerOrder = [id, ...newLayerOrder.filter((el) => el !== id)];
                } else if (moveToIndex >= items.length - 1) {
                    newLayerOrder = [...newLayerOrder.filter((el) => el !== id), id];
                } else {
                    newLayerOrder = [...newLayerOrder];
                    newLayerOrder.splice(index, 1);
                    newLayerOrder.splice(moveToIndex, 0, id);
                }

                props.layerManager.setLayerGroupId(id, groupId);

                setItemsOrder(newLayerOrder);
            }

            function handleElementDrag(id: string, position: Vec2) {
                if (parentDivRef.current === null) {
                    return;
                }

                let index = 0;
                for (const child of parentDivRef.current.childNodes) {
                    if (child instanceof HTMLElement) {
                        const childBoundingRect = child.getBoundingClientRect();

                        if (child.dataset.itemType === "panel-placeholder") {
                            if (rectContainsPoint(childBoundingRect, position)) {
                                moveLayerToIndex(id, props.layerManager.getItems().length - 1, itemType === "layer");
                            }
                        }

                        if (!child.dataset.itemId) {
                            continue;
                        }

                        if (child.dataset.itemId === id) {
                            continue;
                        }

                        if (!rectContainsPoint(childBoundingRect, position)) {
                            index++;
                            continue;
                        }

                        if (itemType === "layer") {
                            if (child.dataset.itemType === "group") {
                                const container = child.querySelector(".layer-container");
                                if (!container) {
                                    continue;
                                }
                                let numChildren = container.childNodes.length;
                                if (
                                    numChildren === 1 &&
                                    (container.childNodes[0] as HTMLElement)?.dataset.itemType === "group-placeholder"
                                ) {
                                    numChildren = 0;
                                }
                                if (position.y <= childBoundingRect.y + 10) {
                                    moveLayerToIndex(id, index, true);
                                } else if (position.y >= childBoundingRect.y + childBoundingRect.height - 10) {
                                    moveLayerToIndex(id, index + numChildren + 1, true);
                                } else {
                                    const groupId = child.dataset.itemId;
                                    if (!groupId) {
                                        continue;
                                    }
                                    let layerIndex = index + 1;
                                    for (const innerChild of container.childNodes) {
                                        if (innerChild instanceof HTMLElement) {
                                            const innerChildBoundingRect = child.getBoundingClientRect();

                                            if (innerChild.dataset.itemType === "group-placeholder") {
                                                moveLayerToIndex(id, layerIndex, true, groupId);
                                            }

                                            if (!innerChild.dataset.itemId) {
                                                continue;
                                            }

                                            if (innerChild.dataset.itemId === id) {
                                                continue;
                                            }

                                            if (!rectContainsPoint(innerChildBoundingRect, position)) {
                                                layerIndex++;
                                                continue;
                                            }

                                            if (
                                                position.y <=
                                                innerChildBoundingRect.y + innerChildBoundingRect.height / 2
                                            ) {
                                                moveLayerToIndex(id, layerIndex, true, groupId);
                                            } else {
                                                moveLayerToIndex(id, layerIndex + 1, true, groupId);
                                            }
                                            layerIndex++;
                                        }
                                    }
                                }
                                index++;
                                continue;
                            }
                        }

                        if (position.y <= childBoundingRect.y + childBoundingRect.height / 2) {
                            moveLayerToIndex(id, index, itemType === "layer");
                        } else {
                            moveLayerToIndex(id, index + 1, itemType === "layer");
                        }
                        index++;
                    }
                }
            }

            function maybeScroll(position: Vec2) {
                if (
                    upperScrollDivRef.current === null ||
                    lowerScrollDivRef.current === null ||
                    scrollDivRef.current === null
                ) {
                    return;
                }

                if (scrollTimeout) {
                    clearTimeout(scrollTimeout);
                    currentScrollTime = 100;
                }

                if (rectContainsPoint(upperScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                } else if (rectContainsPoint(lowerScrollDivRef.current.getBoundingClientRect(), position)) {
                    doScroll = true;
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                } else {
                    doScroll = false;
                }
            }

            function scrollUpRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.max(0, scrollDivRef.current.scrollTop - 10);
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollUpRepeatedly, currentScrollTime);
                }
            }

            function scrollDownRepeatedly() {
                currentScrollTime = Math.max(10, currentScrollTime - 5);
                if (scrollDivRef.current) {
                    scrollDivRef.current.scrollTop = Math.min(
                        scrollDivRef.current.scrollHeight,
                        scrollDivRef.current.scrollTop + 10
                    );
                }
                if (doScroll) {
                    scrollTimeout = setTimeout(scrollDownRepeatedly, currentScrollTime);
                }
            }

            function handlePointerMove(e: PointerEvent) {
                if (!pointerDownPosition || !itemId || !itemType) {
                    return;
                }

                if (
                    !draggingActive &&
                    point2Distance(pointerDownPosition, { x: e.clientX, y: e.clientY }) > MANHATTAN_LENGTH
                ) {
                    draggingActive = true;
                    setDraggingLayerId(itemId);
                }

                if (!draggingActive) {
                    return;
                }

                const dx = e.clientX - pointerDownPositionRelativeToElement.x;
                const dy = e.clientY - pointerDownPositionRelativeToElement.y;
                setDragPosition({ x: dx, y: dy });

                const point: Vec2 = { x: e.clientX, y: e.clientY };

                handleElementDrag(itemId, point);

                maybeScroll(point);
            }

            function handlePointerUp() {
                draggingActive = false;
                pointerDownPosition = null;
                itemId = null;
                setIsDragging(false);
                setDraggingLayerId(null);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                props.layerManager.changeOrder(newLayerOrder);
            }

            currentParentDivRef.addEventListener("pointerdown", handlePointerDown);

            return function handleUnmount() {
                currentParentDivRef.removeEventListener("pointerdown", handlePointerDown);
                document.removeEventListener("pointermove", handlePointerMove);
                document.removeEventListener("pointerup", handlePointerUp);
                setIsDragging(false);
                setDraggingLayerId(null);
            };
        },
        [items, props.layerManager]
    );

    function handleScroll(e: React.UIEvent<HTMLDivElement>) {
        setCurrentScrollPosition(e.currentTarget.scrollTop);
    }

    function makeLayersAndGroupsContent(): React.ReactNode[] {
        const nodes: React.ReactNode[] = [];

        const orderedItems = itemsOrder
            .map((id) => items.find((el) => el.getId() === id))
            .filter((el) => el) as LayerManagerItem[];

        for (let i = 0; i < orderedItems.length; i++) {
            const item = orderedItems[i];

            if (item instanceof LayerGroup) {
                const layers: BaseLayer<any, any>[] = [];
                for (let j = i + 1; j < orderedItems.length; j++) {
                    const nextItem = orderedItems[j];
                    if (nextItem instanceof LayerGroup) {
                        break;
                    }
                    const layerGroupId = props.layerManager.getLayerGroupId(nextItem.getId());
                    if (layerGroupId !== item.getId()) {
                        break;
                    }
                    layers.push(nextItem as BaseLayer<any, any>);
                    i++;
                }

                nodes.push(
                    <LayerGroupComponent
                        key={item.getId()}
                        group={item}
                        ensembleSet={props.ensembleSet}
                        workbenchSession={props.workbenchSession}
                        workbenchSettings={props.workbenchSettings}
                        layerManager={props.layerManager}
                        isDragging={draggingLayerId === item.getId()}
                        dragPosition={dragPosition}
                        onRemoveGroup={handleRemoveGroup}
                        onAddLayer={handleAddLayer}
                        layerTypeToStringMapping={props.layerTypeToStringMapping}
                        draggingLayerId={draggingLayerId}
                        makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                    >
                        {layers.map((layer) => (
                            <LayerComponent
                                key={layer.getId()}
                                layer={layer}
                                inGroup={true}
                                ensembleSet={props.ensembleSet}
                                workbenchSession={props.workbenchSession}
                                workbenchSettings={props.workbenchSettings}
                                onRemoveLayer={handleRemoveItem}
                                isDragging={draggingLayerId === layer.getId()}
                                dragPosition={dragPosition}
                                makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                            />
                        ))}
                    </LayerGroupComponent>
                );
            } else {
                nodes.push(
                    <LayerComponent
                        key={item.getId()}
                        layer={item}
                        inGroup={false}
                        ensembleSet={props.ensembleSet}
                        workbenchSession={props.workbenchSession}
                        workbenchSettings={props.workbenchSettings}
                        onRemoveLayer={handleRemoveItem}
                        isDragging={draggingLayerId === item.getId()}
                        dragPosition={dragPosition}
                        makeSettingsContainerFunc={props.makeSettingsContainerFunc}
                    />
                );
            }
        }

        return nodes;
    }

    return (
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="flex bg-slate-100 p-2 items-center border-b border-gray-300 gap-2">
                <div className="flex-grow font-bold text-sm">Layers</div>
                {props.allowGroups && (
                    <div
                        className="hover:cursor-pointer hover:bg-blue-100 p-0.5 rounded text-sm flex items-center gap-2"
                        onClick={handleAddGroup}
                    >
                        <CreateNewFolder fontSize="inherit" />
                        <span>Add group</span>
                    </div>
                )}
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
            </div>
            {isDragging &&
                createPortal(
                    <div className="absolute z-40 transparent w-screen h-screen inset-0 cursor-grabbing select-none"></div>
                )}
            <div className="w-full flex-grow flex flex-col relative">
                <div
                    className="absolute top-0 left-0 w-full h-5 z-50 pointer-events-none"
                    ref={upperScrollDivRef}
                ></div>
                <div
                    className="absolute left-0 bottom-0 w-full h-5 z-50 pointer-events-none"
                    ref={lowerScrollDivRef}
                ></div>
                <div
                    className="flex-grow overflow-auto min-h-0 bg-slate-200 relative"
                    ref={scrollDivRef}
                    onScroll={handleScroll}
                >
                    <div className="flex flex-col border border-slate-100 relative max-h-0" ref={parentDivRef}>
                        {makeLayersAndGroupsContent()}
                        <div className="flex-grow" data-item-type="panel-placeholder"></div>
                    </div>
                    {items.length === 0 && (
                        <div className="flex h-full -mt-1 justify-center text-sm items-center gap-1">
                            Click on <Add fontSize="inherit" /> to add a layer.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
