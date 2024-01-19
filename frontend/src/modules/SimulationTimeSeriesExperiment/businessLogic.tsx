import { Frequency_api, VectorRealizationData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleBusinessLogic } from "@framework/ModuleBusinessLogic";
import { WorkbenchServices } from "@framework/WorkbenchServices";
import { WorkbenchSession, WorkbenchSessionEvent } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { VectorDescription } from "src/api/models/VectorDescription";

export interface UserSelections {
    ensembleIdent: EnsembleIdent | null;
    vector: string;
    resamplingFrequency: Frequency_api | null;
    showStatistics: boolean;
    showRealizations: boolean;
    showHistorical: boolean;
}

export interface FetchedData {
    vectorDescriptions: VectorDescription[];
    vectorData: VectorRealizationData_api[];
}

export interface UtilityStates {
    hasHistoricalVector: boolean;
}

export interface LoadingStates {
    vectors: boolean;
    vectorData: boolean;
}

export interface State {
    fetchedData: FetchedData;
    userSelections: UserSelections;
    utilityStates: UtilityStates;
    loadingStates: LoadingStates;
}

export class BusinessLogic extends ModuleBusinessLogic<State> {
    constructor(
        workbenchServices: WorkbenchServices,
        workbenchSession: WorkbenchSession,
        workbenchSettings: WorkbenchSettings
    ) {
        super(workbenchServices, workbenchSession, workbenchSettings);

        this._workbenchSession = workbenchSession;

        this._state = {
            fetchedData: {
                vectorDescriptions: [],
                vectorData: [],
            },
            userSelections: {
                ensembleIdent: null,
                vector: "",
                resamplingFrequency: Frequency_api.MONTHLY,
                showStatistics: true,
                showRealizations: false,
                showHistorical: true,
            },
            utilityStates: {
                hasHistoricalVector: false,
            },
            loadingStates: {
                vectors: false,
                vectorData: false,
            },
        };

        this.handleEnsembleSetChange = this.handleEnsembleSetChange.bind(this);
        this.handleSyncedEnsembleChange = this.handleSyncedEnsembleChange.bind(this);

        this._workbenchSession.subscribe(WorkbenchSessionEvent.EnsembleSetChanged, this.handleEnsembleSetChange);
        workbenchServices.subscribe("global.syncValue.ensembles", this.handleSyncedEnsembleChange);
    }

    handleSyncedEnsembleChange(newEnsembleIdents: EnsembleIdent[] | null) {
        if (newEnsembleIdents && newEnsembleIdents.length > 0) {
            this.setEnsembleIdent(newEnsembleIdents[0]);
        }
    }

    handleEnsembleSetChange() {
        const newEnsembleSet = this._workbenchSession.getEnsembleSet();
        const currentEnsembleIdent = this.getState().userSelections.ensembleIdent;
        if (!currentEnsembleIdent || newEnsembleSet.findEnsemble(currentEnsembleIdent)) {
            this.updateState({ userSelections: { ensembleIdent: newEnsembleSet.getEnsembleArr()[0].getIdent() } });
        }
    }

    setEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        this.updateState({ userSelections: { ensembleIdent } });
        this.fetchVectors();
    }

    setResamplingFrequency(resamplingFrequency: Frequency_api | null) {
        this.updateState({ userSelections: { resamplingFrequency } });
    }

    setShowStatistics(showStatistics: boolean) {
        this.updateState({ userSelections: { showStatistics } });
    }

    setShowRealizations(showRealizations: boolean) {
        this.updateState({ userSelections: { showRealizations } });
    }

    setShowHistorical(showHistorical: boolean) {
        this.updateState({ userSelections: { showHistorical } });
    }

    setVector(vector: string) {
        this.updateState({
            userSelections: { vector },
            utilityStates: { hasHistoricalVector: this.hasHistoricalVector(vector) },
        });
        this.fetchVectorData();
    }

    private hasHistoricalVector(nonHistoricalVectorName: string): boolean {
        if (
            !this.getState().fetchedData.vectorDescriptions ||
            this.getState().fetchedData.vectorDescriptions.length === 0
        ) {
            return false;
        }

        const foundItem = this.getState().fetchedData.vectorDescriptions.find(
            (item) => item.name === nonHistoricalVectorName
        );
        if (foundItem) {
            return foundItem.has_historical;
        }

        return false;
    }

    private async fetchVectors() {
        // This should be a separate module, but for now we just do it here for testing
        this.updateState({ loadingStates: { vectors: true } });

        const vectors = await this._queryClient.fetchQuery({
            queryKey: ["getVectorList", this.getState().userSelections.ensembleIdent],
            queryFn: () =>
                apiService.timeseries.getVectorList(
                    this.getState().userSelections.ensembleIdent?.getCaseUuid() ?? "",
                    this.getState().userSelections.ensembleIdent?.getEnsembleName() ?? ""
                ),
        });

        this.updateState({ loadingStates: { vectors: false }, fetchedData: { vectorDescriptions: vectors } });
    }

    private async fetchVectorData() {
        // This should be a separate module, but for now we just do it here for testing
        this.updateState({ loadingStates: { vectorData: true } });

        const userSelections = this.getState().userSelections;

        const vectorData = await this._queryClient.fetchQuery({
            queryKey: [
                "getVectorData",
                userSelections.ensembleIdent,
                userSelections.vector,
                userSelections.resamplingFrequency,
                userSelections.showRealizations,
            ],
            queryFn: () =>
                apiService.timeseries.getRealizationsVectorData(
                    userSelections.ensembleIdent?.getCaseUuid() ?? "",
                    userSelections.ensembleIdent?.getEnsembleName() ?? "",
                    userSelections.vector,
                    userSelections.resamplingFrequency,
                    undefined
                ),
        });

        this.updateState({ fetchedData: { vectorData }, loadingStates: { vectorData: false } });
    }
}
