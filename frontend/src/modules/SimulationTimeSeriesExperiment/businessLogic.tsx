import { Frequency_api } from "@api";
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

export class BusinessLogic extends ModuleBusinessLogic<FetchedData, UserSelections, UtilityStates, LoadingStates> {
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
        const currentEnsembleIdent = this.getUserSelections().ensembleIdent;
        if (!currentEnsembleIdent || newEnsembleSet.findEnsemble(currentEnsembleIdent)) {
            this.updateUserSelections({ ensembleIdent: newEnsembleSet.getEnsembleArr()[0].getIdent() });
        }
    }

    setEnsembleIdent(ensembleIdent: EnsembleIdent | null) {
        this.updateUserSelections({ ensembleIdent });
        this.fetchVectors();
    }

    setResamplingFrequency(resamplingFrequency: Frequency_api | null) {
        this.updateUserSelections({ resamplingFrequency });
    }

    setShowStatistics(showStatistics: boolean) {
        this.updateUserSelections({ showStatistics });
    }

    setShowRealizations(showRealizations: boolean) {
        this.updateUserSelections({ showRealizations });
    }

    setShowHistorical(showHistorical: boolean) {
        this.updateUserSelections({ showHistorical });
    }

    setVector(vector: string) {
        this.updateUtilityStates({ hasHistoricalVector: this.hasHistoricalVector(vector) });
        this.updateUserSelections({ vector });
        this.fetchVectorData();
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

    private async fetchVectorData() {
        this.updateLoadingStates({ vectorData: true });

        const vectorData = await this._queryClient.fetchQuery({
            queryKey: [
                "getVectorData",
                this.getUserSelections().ensembleIdent,
                this.getUserSelections().vector,
                this.getUserSelections().resamplingFrequency,
                this.getUserSelections().showRealizations,
            ],
            queryFn: () =>
                apiService.timeseries.getRealizationsVectorData(
                    this.getUserSelections().ensembleIdent?.getCaseUuid() ?? "",
                    this.getUserSelections().ensembleIdent?.getEnsembleName() ?? "",
                    this.getUserSelections().vector,
                    this.getUserSelections().resamplingFrequency,
                    undefined
                ),
        });

        this.updateFetchedData({ vectorData });
        this.updateLoadingStates({ vectorData: false });
    }
}
