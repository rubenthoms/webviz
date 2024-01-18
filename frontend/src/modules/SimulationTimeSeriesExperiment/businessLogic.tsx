import React from "react";

import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { WorkbenchSession, WorkbenchSessionEvent } from "@framework/WorkbenchSession";
import { QueryClient } from "@tanstack/react-query";

import { VectorDescription } from "src/api/models/VectorDescription";

export type ModuleBLBaseState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> = {
    fetchedData: TFetchedData;
    userSelections: TUserSelections;
    utilityStates: TUtilityStates;
    loadingStates: TLoadingStates;
};

class ModuleBLBase<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> {
    protected _queryClient: QueryClient;
    _state: ModuleBLBaseState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> = {
        fetchedData: {} as TFetchedData,
        userSelections: {} as TUserSelections,
        utilityStates: {} as TUtilityStates,
        loadingStates: {} as TLoadingStates,
    };
    private _subscribers: Set<() => void> = new Set();
    private _timeout: ReturnType<typeof setTimeout> | null = null;

    constructor(workbenchServices: WorkbenchServices) {
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

    getSnapshot(): ModuleBLBaseState<TFetchedData, TUserSelections, TUtilityStates, TLoadingStates> {
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

export interface UserSelections {
    ensembleIdent: EnsembleIdent | null;
    vector: string;
}

export interface FetchedData {
    vectorDescriptions: VectorDescription[];
}

export interface UtilityStates {
    hasHistoricalVector: boolean;
}

export interface LoadingStates {
    vectors: boolean;
}

export class BusinessLogic extends ModuleBLBase<FetchedData, UserSelections, UtilityStates, LoadingStates> {
    private _workbenchSession: WorkbenchSession;

    constructor(workbenchServices: WorkbenchServices, workbenchSession: WorkbenchSession) {
        super(workbenchServices);

        this._workbenchSession = workbenchSession;

        this._state = {
            fetchedData: {
                vectorDescriptions: [],
            },
            userSelections: {
                ensembleIdent: null,
                vector: "",
            },
            utilityStates: {
                hasHistoricalVector: false,
            },
            loadingStates: {
                vectors: false,
            },
        };

        this.handleEnsembleSetChange = this.handleEnsembleSetChange.bind(this);

        this._workbenchSession.subscribe(WorkbenchSessionEvent.EnsembleSetChanged, this.handleEnsembleSetChange);
    }

    handleEnsembleSetChange() {
        const newEnsembleSet = this._workbenchSession.getEnsembleSet();
        const currentEnsembleIdent = this.getUserSelections().ensembleIdent;
        if (!currentEnsembleIdent || newEnsembleSet.findEnsemble(currentEnsembleIdent)) {
            this.updateUserSelections({ ensembleIdent: newEnsembleSet.getEnsembleArr()[0].getIdent() });
        }
    }

    setEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        this.updateUserSelections({ ensembleIdent });
        this.fetchVectors();
    }

    setVector(vector: string) {
        this.updateUtilityStates({ hasHistoricalVector: this.hasHistoricalVector(vector) });
        this.updateUserSelections({ vector });
    }

    private hasHistoricalVector(nonHistoricalVectorName: string): boolean {
        if (!this.getFetchedData().vectorDescriptions || this.getFetchedData().vectorDescriptions.length === 0) {
            return false;
        }

        const foundItem = this.getFetchedData().vectorDescriptions.find(
            (item) => item.name === nonHistoricalVectorName
        );
        if (foundItem) {
            return foundItem.has_historical;
        }

        return false;
    }

    private async fetchVectors() {
        this.updateLoadingStates({ vectors: true });

        const vectors = await this._queryClient.fetchQuery({
            queryKey: ["getVectorList", this.getUserSelections().ensembleIdent],
            queryFn: () =>
                apiService.timeseries.getVectorList(
                    this.getUserSelections().ensembleIdent?.getCaseUuid() ?? "",
                    this.getUserSelections().ensembleIdent?.getEnsembleName() ?? ""
                ),
        });

        this.updateFetchedData({ vectorDescriptions: vectors });
        this.updateLoadingStates({ vectors: false });
    }
}

type Class<T> = new (...args: any[]) => T;

export function useBusinessLogic<T extends ModuleBLBase<any, any, any, any>>(
    blClass: Class<T>,
    workbenchServices: WorkbenchServices,
    workbenchSession: WorkbenchSession
): [T["_state"], Omit<T, "_state" | "getSnapshot">] {
    const businessLogicClass = React.useRef<T>(new blClass(workbenchServices, workbenchSession));
    const state = React.useSyncExternalStore<T["_state"]>(
        businessLogicClass.current.subscribe,
        businessLogicClass.current.getSnapshot
    );

    return [state, businessLogicClass.current];
}
