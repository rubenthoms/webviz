import React from "react";

import { WorkbenchServices } from "@framework/WorkbenchServices";
import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { QueryClient } from "@tanstack/react-query";

import { merge } from "lodash";

type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;

export class ModuleBusinessLogic<TState> {
    protected _queryClient: QueryClient;
    _state: TState = {} as TState;

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

    getSnapshot(): TState {
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

    protected updateState(newState: DeepPartial<TState>) {
        merge(this._state, newState);

        this.notifySubscribers();
    }

    protected getState(): TState {
        return this._state;
    }
}

export function useBusinessLogic<T extends ModuleBusinessLogic<any>>(businessLogic: T): T["_state"] {
    const state = React.useSyncExternalStore<T["_state"]>(businessLogic.subscribe, businessLogic.getSnapshot);

    return state;
}
