import React from "react";

import { Point } from "@lib/utils/geometry";

export enum DrawerContent {
    ModuleSettings = "ModuleSettings",
    ModulesList = "ModulesList",
    TemplatesList = "TemplatesList",
    SyncSettings = "SyncSettings",
    ColorPaletteSettings = "ColorPaletteSettings",
}

export enum GuiState {
    DrawerContent = "drawerContent",
    SettingsPanelWidthInPercent = "settingsPanelWidthInPercent",
    LoadingEnsembleSet = "loadingEnsembleSet",
    ActiveModuleInstanceId = "activeModuleInstanceId",
    DataChannelConnectionLayerVisible = "dataChannelConnectionLayerVisible",
}

export enum GuiEvent {
    ModuleHeaderPointerDown = "moduleHeaderPointerDown",
    NewModulePointerDown = "newModulePointerDown",
    RemoveModuleInstanceRequest = "removeModuleInstanceRequest",
    EditDataChannelConnectionsForModuleInstanceRequest = "editDataChannelConnectionsForModuleInstanceRequest",
    ShowDataChannelConnectionsRequest = "showDataChannelConnectionsRequest",
    HideDataChannelConnectionsRequest = "hideDataChannelConnectionsRequest",
    HighlightDataChannelConnectionRequest = "highlightDataChannelConnectionRequest",
    UnhighlightDataChannelConnectionRequest = "unhighlightDataChannelConnectionRequest",
    DataChannelPointerUp = "dataChannelPointerUp",
    DataChannelOriginPointerDown = "dataChannelOriginPointerDown",
    DataChannelConnectionsChange = "dataChannelConnectionsChange",
    DataChannelNodeHover = "dataChannelNodeHover",
    DataChannelNodeUnhover = "dataChannelNodeUnhover",
}

export type GuiEventPayloads = {
    [GuiEvent.ModuleHeaderPointerDown]: {
        moduleInstanceId: string;
        elementPosition: Point;
        pointerPosition: Point;
    };
    [GuiEvent.NewModulePointerDown]: {
        moduleName: string;
        elementPosition: Point;
        pointerPosition: Point;
    };
    [GuiEvent.RemoveModuleInstanceRequest]: {
        moduleInstanceId: string;
    };
    [GuiEvent.EditDataChannelConnectionsForModuleInstanceRequest]: {
        moduleInstanceId: string;
    };
    [GuiEvent.ShowDataChannelConnectionsRequest]: {};
    [GuiEvent.HideDataChannelConnectionsRequest]: {};
    [GuiEvent.HighlightDataChannelConnectionRequest]: {
        moduleInstanceId: string;
        dataChannelName: string;
    };
    [GuiEvent.UnhighlightDataChannelConnectionRequest]: {};
    [GuiEvent.DataChannelConnectionsChange]: {};
    [GuiEvent.DataChannelOriginPointerDown]: {
        moduleInstanceId: string;
        originElement: HTMLElement;
    };
    [GuiEvent.DataChannelPointerUp]: {};
    [GuiEvent.DataChannelNodeHover]: {
        connectionAllowed: boolean;
    };
    [GuiEvent.DataChannelNodeUnhover]: {};
};

type GuiStateValueTypes = {
    [GuiState.DrawerContent]: DrawerContent;
    [GuiState.SettingsPanelWidthInPercent]: number;
    [GuiState.LoadingEnsembleSet]: boolean;
    [GuiState.ActiveModuleInstanceId]: string;
    [GuiState.DataChannelConnectionLayerVisible]: boolean;
};

const defaultStates: Map<GuiState, any> = new Map();
defaultStates.set(GuiState.DrawerContent, DrawerContent.ModuleSettings);
defaultStates.set(GuiState.SettingsPanelWidthInPercent, 30);
defaultStates.set(GuiState.LoadingEnsembleSet, false);
defaultStates.set(GuiState.ActiveModuleInstanceId, "");

const persistentStates: GuiState[] = [GuiState.SettingsPanelWidthInPercent];

export class GuiMessageBroker {
    private _eventListeners: Map<GuiEvent, Set<(event: any) => void>>;
    private _stateSubscribers: Map<GuiState, Set<(state: any) => void>>;
    private _storedValues: Map<GuiState, any>;

    constructor() {
        this._eventListeners = new Map();
        this._stateSubscribers = new Map();
        this._storedValues = defaultStates;

        this.loadPersistentStates();
    }

    private loadPersistentStates() {
        persistentStates.forEach((state) => {
            const value = localStorage.getItem(state);
            if (value) {
                this._storedValues.set(state, JSON.parse(value));
            }
        });
    }

    private maybeSavePersistentState(state: GuiState) {
        if (persistentStates.includes(state)) {
            // For now, persistent states are only stored in localStorage
            // However, in the future, we may want to store at least some of them in a database on the server
            localStorage.setItem(state, JSON.stringify(this._storedValues.get(state)));
        }
    }

    subscribeToEvent<T extends GuiEvent>(event: T, callback: (payload: GuiEventPayloads[T]) => void) {
        const eventListeners = this._eventListeners.get(event) || new Set();
        eventListeners.add(callback);
        this._eventListeners.set(event, eventListeners);

        return () => {
            eventListeners.delete(callback);
        };
    }

    publishEvent<T extends GuiEvent>(event: T, payload: GuiEventPayloads[T]) {
        const eventListeners = this._eventListeners.get(event);
        if (eventListeners) {
            eventListeners.forEach((callback) => callback({ ...payload }));
        }
    }

    makeStateSubscriberFunction<T extends GuiState>(state: T): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const stateSubscriber = (onStoreChangeCallback: () => void): (() => void) => {
            const stateSubscribers = this._stateSubscribers.get(state) || new Set();
            stateSubscribers.add(onStoreChangeCallback);
            this._stateSubscribers.set(state, stateSubscribers);

            return () => {
                stateSubscribers.delete(onStoreChangeCallback);
            };
        };

        return stateSubscriber;
    }

    setState<T extends GuiState>(state: T, value: GuiStateValueTypes[T]) {
        this._storedValues.set(state, value);
        this.maybeSavePersistentState(state);

        const stateSubscribers = this._stateSubscribers.get(state);
        if (stateSubscribers) {
            stateSubscribers.forEach((subscriber) => subscriber(value));
        }
    }

    getState<T extends GuiState>(state: T): GuiStateValueTypes[T] {
        return this._storedValues.get(state);
    }

    /*
        It is really important that the snapshot returned by "stateSnapshotGetter"
        returns the same value as long as the state has not been changed.

    */
    makeStateSnapshotGetter<T extends GuiState>(state: T): () => GuiStateValueTypes[T] {
        // Using arrow function in order to keep "this" in context
        const stateSnapshotGetter = (): GuiStateValueTypes[T] => {
            return this._storedValues.get(state);
        };

        return stateSnapshotGetter;
    }
}

export function useGuiState<T extends GuiState>(
    guiMessageBroker: GuiMessageBroker,
    state: T
): [
    GuiStateValueTypes[T],
    (value: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T])) => void
] {
    const stateValue = React.useSyncExternalStore<GuiStateValueTypes[T]>(
        guiMessageBroker.makeStateSubscriberFunction(state),
        guiMessageBroker.makeStateSnapshotGetter(state)
    );

    function stateSetter(
        valueOrFunc: GuiStateValueTypes[T] | ((prev: GuiStateValueTypes[T]) => GuiStateValueTypes[T])
    ): void {
        if (valueOrFunc instanceof Function) {
            guiMessageBroker.setState(state, valueOrFunc(stateValue));
            return;
        }
        guiMessageBroker.setState(state, valueOrFunc);
    }

    return [stateValue, stateSetter];
}

export function useGuiValue<T extends GuiState>(guiMessageBroker: GuiMessageBroker, state: T): GuiStateValueTypes[T] {
    const [stateValue] = useGuiState(guiMessageBroker, state);
    return stateValue;
}
