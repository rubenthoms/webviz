import { SurfaceIntersectionData_api, WellborePicksAndStratigraphicUnits_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { QueryClient } from "@tanstack/query-core";

import { BaseLayer, LayerTopic } from "./BaseLayer";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type WellpicksLayerSettings = {
    wellboreUuid: string | null;
    ensembleIdent: EnsembleIdent | null;
    selectedPicks: string[];
};

export class WellpicksLayer extends BaseLayer<WellpicksLayerSettings, WellborePicksAndStratigraphicUnits_api> {
    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            wellboreUuid: null,
            selectedPicks: [],
        };
        super(name, defaultSettings, queryClient);
    }

    protected areSettingsValid(): boolean {
        return this._settings.ensembleIdent !== null && this._settings.wellboreUuid !== null;
    }

    protected async fetchData(): Promise<WellborePicksAndStratigraphicUnits_api> {
        return this._queryClient.fetchQuery({
            queryKey: [
                "getWellborePicksAndStratigraphicUnits",
                this._settings.ensembleIdent?.getCaseUuid(),
                this._settings.wellboreUuid,
            ],
            queryFn: () =>
                apiService.well.getWellborePicksAndStratigraphicUnits(
                    this._settings.ensembleIdent?.getCaseUuid() ?? "",
                    this._settings.wellboreUuid ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    }
}

export function isWellpicksLayer(layer: BaseLayer<any, any>): layer is WellpicksLayer {
    return layer instanceof WellpicksLayer;
}
