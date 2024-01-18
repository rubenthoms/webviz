import React from "react";

import { WorkbenchServices } from "@framework/WorkbenchServices";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

export type ModuleBusinessLogicState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> = {
    fetchedData: TFetchedData;
    userSelections: TUserSelections;
    utilityStates: TUtilityStates;
    loadingStates: TLoadingStates;
};

export class ModuleBusinessLogic<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> {
    protected _queryClient: QueryClient;
    _state: ModuleBusinessLogicState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> = {
        fetchedData: {} as TFetchedData,
        userSelections: {} as TUserSelections,
        utilityStates: {} as TUtilityStates,
        loadingStates: {} as TLoadingStates,
    };
    private _subscribers: Set<() => void> = new Set();
    private _timeout: ReturnType<typeof setTimeout> | null = null;
    protected _workbenchSession: WorkbenchSession;
    protected _workbenchSettings: WorkbenchSettings;
    protected _workbenchServices: WorkbenchServices;

    constructor(
        workbenchServices: WorkbenchServices,
        workbenchSession: WorkbenchSession,
        workbenchSettings: WorkbenchSettings
    ) {
        this._workbenchSession = workbenchSession;
        this._workbenchSettings = workbenchSettings;
        this._workbenchServices = workbenchServices;
        this._queryClient = workbenchServices.getQueryClient();

        this.getSnapshot = this.getSnapshot.bind(this);
        this.subscribe = this.subscribe.bind(this);
    }

    subscribe(onStoreChangeCallback: () => void): () => void {
        this._subscribers.add(onStoreChangeCallback);

        return () => {
            this._subscribers.delete(onStoreChangeCallback);
        };
    }

    getSnapshot(): ModuleBusinessLogicState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> {
        return this._state;
    }

    private notifySubscribers() {
        if (this._timeout) {
            clearTimeout(this._timeout);
        }

        this._timeout = setTimeout(() => {
            this._timeout = null;
            for (const subscriber of this._subscribers) {
                subscriber();
            }
        }, 100);
    }

    protected updateFetchedData(newState: Partial<TFetchedData>) {
        this._state = { ...this._state, fetchedData: { ...this._state.fetchedData, ...newState } };

        this.notifySubscribers();
    }

    protected updateUserSelections(newState: Partial<TUserSelections>) {
        this._state = { ...this._state, userSelections: { ...this._state.userSelections, ...newState } };

        this.notifySubscribers();
    }

    protected updateUtilityStates(newState: Partial<TUtilityStates>) {
        this._state = { ...this._state, utilityStates: { ...this._state.utilityStates, ...newState } };

        this.notifySubscribers();
    }

    protected updateLoadingStates(newState: Partial<TLoadingStates>) {
        this._state = { ...this._state, loadingStates: { ...this._state.loadingStates, ...newState } };

        this.notifySubscribers();
    }

    protected getFetchedData(): TFetchedData {
        return this._state.fetchedData;
    }

    protected getUserSelections(): TUserSelections {
        return this._state.userSelections;
    }

    protected getUtilityStates(): TUtilityStates {
        return this._state.utilityStates;
    }

    protected getLoadingStates(): TLoadingStates {
        return this._state.loadingStates;
    }
}

export function useBusinessLogic<T extends ModuleBusinessLogic<any, any, any, any>>(businessLogic: T): T["_state"] {
    const state = React.useSyncExternalStore<T["_state"]>(businessLogic.subscribe, businessLogic.getSnapshot);

    return state;
}
