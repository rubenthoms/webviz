import { PolygonData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { ItemDelegate } from "@modules/LayerSpike/layers/delegates/ItemDelegate";
import { LayerDelegate } from "@modules/LayerSpike/layers/delegates/LayerDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationFaultPolygonsContext } from "./RealizationFaultPolygonsContext";
import { RealizationFaultPolygonsSettings } from "./types";

import { Layer } from "../../../interfaces";

export class RealizationFaultPolygonsLayer implements Layer<RealizationFaultPolygonsSettings, PolygonData_api[]> {
    private _layerDelegate: LayerDelegate<RealizationFaultPolygonsSettings, PolygonData_api[]>;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("RealizationFaultPolygonsLayer");
        this._layerDelegate = new LayerDelegate(this, new RealizationFaultPolygonsContext());
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationFaultPolygonsSettings, PolygonData_api[]> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationFaultPolygonsSettings,
        newSettings: RealizationFaultPolygonsSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<PolygonData_api[]> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.FAULT_POLYGONS_ATTRIBUTE].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute && realizationNum) {
        }

        const queryKey = [
            "getPolygonsData",
            ensembleIdent?.getCaseUuid() ?? "",
            ensembleIdent?.getEnsembleName() ?? "",
            realizationNum ?? 0,
            surfaceName ?? "",
            attribute ?? "",
        ];
        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
                apiService.polygons.getPolygonsData(
                    ensembleIdent?.getCaseUuid() ?? "",
                    ensembleIdent?.getEnsembleName() ?? "",
                    realizationNum ?? 0,
                    surfaceName ?? "",
                    attribute ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        return promise;
    }
}
