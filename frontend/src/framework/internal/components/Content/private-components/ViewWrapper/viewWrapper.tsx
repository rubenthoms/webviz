import React from "react";

import { DrawerContent, GuiEvent, GuiState, useGuiState, useGuiValue } from "@framework/GuiMessageBroker";
import { ModuleInstance } from "@framework/ModuleInstance";
import { Workbench } from "@framework/Workbench";
import { Point, pointDifference, pointRelativeToDomRect, pointerEventToPoint } from "@lib/utils/geometry";

import { ChannelSelector } from "./private-components/channelSelector";
import { Header } from "./private-components/header";
import { InputChannelNode } from "./private-components/inputChannelNode";
import { InputChannelNodeWrapper } from "./private-components/inputChannelNodeWrapper";
import { ViewContent } from "./private-components/viewContent";

import { ViewWrapperPlaceholder } from "../viewWrapperPlaceholder";

type ViewWrapperProps = {
    isActive: boolean;
    moduleInstance: ModuleInstance<any>;
    workbench: Workbench;
    width: number;
    height: number;
    x: number;
    y: number;
    isDragged: boolean;
    dragPosition: Point;
};

export const ViewWrapper: React.FC<ViewWrapperProps> = (props) => {
    const ref = React.useRef<HTMLDivElement>(null);
    const [drawerContent, setDrawerContent] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.DrawerContent
    );
    const [settingsPanelWidth, setSettingsPanelWidth] = useGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.SettingsPanelWidthInPercent
    );

    const guiMessageBroker = props.workbench.getGuiMessageBroker();

    const dataChannelConnectionsLayerVisible = useGuiValue(
        guiMessageBroker,
        GuiState.DataChannelConnectionLayerVisible
    );

    const timeRef = React.useRef<number | null>(null);

    const [currentInputName, setCurrentInputName] = React.useState<string | null>(null);
    const [channelSelectorCenterPoint, setChannelSelectorCenterPoint] = React.useState<Point | null>(null);
    const [selectableChannels, setSelectableChannels] = React.useState<string[]>([]);

    const handleHeaderPointerDown = React.useCallback(
        function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
            if (ref.current) {
                const point = pointerEventToPoint(e.nativeEvent);
                const rect = ref.current.getBoundingClientRect();
                guiMessageBroker.publishEvent(GuiEvent.ModuleHeaderPointerDown, {
                    moduleInstanceId: props.moduleInstance.getId(),
                    elementPosition: pointDifference(point, pointRelativeToDomRect(point, rect)),
                    pointerPosition: point,
                });
            }
        },
        [props.moduleInstance]
    );

    const handleRemoveClick = React.useCallback(
        function handleRemoveClick(e: React.PointerEvent<HTMLDivElement>) {
            guiMessageBroker.publishEvent(GuiEvent.RemoveModuleInstanceRequest, {
                moduleInstanceId: props.moduleInstance.getId(),
            });
            e.preventDefault();
            e.stopPropagation();
        },
        [props.moduleInstance]
    );

    function handleModuleClick() {
        if (dataChannelConnectionsLayerVisible) {
            return;
        }
        if (settingsPanelWidth <= 5) {
            setSettingsPanelWidth(20);
        }
        if (drawerContent !== DrawerContent.SyncSettings) {
            setDrawerContent(DrawerContent.ModuleSettings);
        }
        if (props.isActive) return;
        props.workbench.getGuiMessageBroker().setState(GuiState.ActiveModuleInstanceId, props.moduleInstance.getId());
    }

    function handlePointerDown() {
        timeRef.current = Date.now();
    }

    function handlePointerUp() {
        if (drawerContent === DrawerContent.ModulesList) {
            if (!timeRef.current || Date.now() - timeRef.current < 800) {
                handleModuleClick();
            }
            return;
        }
        handleModuleClick();
    }

    function handleInputChannelsClick(e: React.PointerEvent<HTMLDivElement>): void {
        guiMessageBroker.publishEvent(GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest, {
            moduleInstanceId: props.moduleInstance.getId(),
        });
        e.stopPropagation();
    }

    const handleChannelConnect = React.useCallback(
        function handleChannelConnect(inputName: string, moduleInstanceId: string, destinationPoint: Point) {
            const originModuleInstance = props.workbench.getModuleInstance(moduleInstanceId);

            if (!originModuleInstance) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
                return;
            }

            const acceptedKeys = props.moduleInstance
                .getInputChannelDefs()
                .find((channelDef) => channelDef.name === inputName)?.keyCategories;

            const channels = Object.values(originModuleInstance.getBroadcastChannels()).filter((channel) => {
                if (!acceptedKeys || acceptedKeys.some((key) => channel.getDataDef().key === key)) {
                    return Object.values(props.moduleInstance.getInputChannels()).every((inputChannel) => {
                        if (inputChannel.getDataDef().key === channel.getDataDef().key) {
                            return true;
                        }
                        return false;
                    });
                }
                return false;
            });

            if (channels.length === 0) {
                guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
                return;
            }

            if (channels.length > 1) {
                setChannelSelectorCenterPoint(destinationPoint);
                setSelectableChannels(Object.values(channels).map((channel) => channel.getName()));
                setCurrentInputName(inputName);
                return;
            }

            const channelName = Object.values(channels)[0].getName();

            props.moduleInstance.setInputChannel(inputName, channelName);
            guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
        },
        [props.moduleInstance, props.workbench]
    );

    const handleChannelDisconnect = React.useCallback(
        function handleChannelDisconnect(inputName: string) {
            props.moduleInstance.removeInputChannel(inputName);
            guiMessageBroker.publishEvent(GuiEvent.DataChannelConnectionsChange, {});
        },
        [props.moduleInstance]
    );

    function handleCancelChannelSelection() {
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});
    }

    function handleChannelSelection(channelName: string) {
        guiMessageBroker.publishEvent(GuiEvent.HideDataChannelConnectionsRequest, {});

        if (!currentInputName) {
            return;
        }
        setChannelSelectorCenterPoint(null);
        setSelectableChannels([]);

        props.moduleInstance.setInputChannel(currentInputName, channelName);
    }

    const showAsActive =
        props.isActive && [DrawerContent.ModuleSettings, DrawerContent.SyncSettings].includes(drawerContent);

    return (
        <>
            {props.isDragged && (
                <ViewWrapperPlaceholder width={props.width} height={props.height} x={props.x} y={props.y} />
            )}
            <div
                ref={ref}
                className="absolute box-border p-0.5"
                style={{
                    width: props.width,
                    height: props.height,
                    left: props.isDragged ? props.dragPosition.x : props.x,
                    top: props.isDragged ? props.dragPosition.y : props.y,
                    zIndex: props.isDragged ? 1 : 0,
                    opacity: props.isDragged ? 0.5 : 1,
                }}
            >
                <div
                    className={`bg-white h-full w-full flex flex-col ${
                        showAsActive && drawerContent ? "border-blue-500" : ""
                    } border-solid border-2 box-border shadow ${
                        props.isDragged ? "cursor-grabbing select-none" : "cursor-grab"
                    }}`}
                    onPointerDown={handlePointerDown}
                    onPointerUp={handlePointerUp}
                >
                    <Header
                        moduleInstance={props.moduleInstance}
                        isDragged={props.isDragged}
                        onPointerDown={handleHeaderPointerDown}
                        onRemoveClick={handleRemoveClick}
                        onInputChannelsClick={handleInputChannelsClick}
                        guiMessageBroker={guiMessageBroker}
                    />
                    <div className="flex-grow overflow-auto h-0" onClick={handleModuleClick}>
                        <ViewContent workbench={props.workbench} moduleInstance={props.moduleInstance} />
                        <InputChannelNodeWrapper
                            forwardedRef={ref}
                            guiMessageBroker={guiMessageBroker}
                            moduleInstanceId={props.moduleInstance.getId()}
                        >
                            {props.moduleInstance.getInputChannelDefs().map((channelDef) => {
                                return (
                                    <InputChannelNode
                                        key={channelDef.name}
                                        moduleInstanceId={props.moduleInstance.getId()}
                                        inputName={channelDef.name}
                                        displayName={channelDef.displayName}
                                        channelKeyCategories={channelDef.keyCategories}
                                        workbench={props.workbench}
                                        onChannelConnect={handleChannelConnect}
                                        onChannelConnectionDisconnect={handleChannelDisconnect}
                                    />
                                );
                            })}
                        </InputChannelNodeWrapper>
                        {channelSelectorCenterPoint && (
                            <ChannelSelector
                                position={channelSelectorCenterPoint}
                                channelNames={selectableChannels}
                                onCancel={handleCancelChannelSelection}
                                onSelectChannel={handleChannelSelection}
                            />
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
