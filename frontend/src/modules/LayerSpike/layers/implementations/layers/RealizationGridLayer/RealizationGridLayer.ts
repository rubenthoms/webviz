import { apiService } from "@framework/ApiService";
import {
    GridMappedProperty_trans,
    transformGridMappedProperty,
} from "@modules/3DViewer/view/queries/queryDataTransforms";
import { ItemDelegate } from "@modules/LayerSpike/layers/delegates/ItemDelegate";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { SettingType } from "@modules/LayerSpike/layers/settingsTypes";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { RealizationGridContext } from "./RealizationGridContext";
import { RealizationGridSettings } from "./types";

import { LayerDelegate } from "../../../delegates/LayerDelegate";
import { Layer } from "../../../interfaces";

export class RealizationGridLayer implements Layer<RealizationGridSettings, GridMappedProperty_trans> {
    private _layerDelegate: LayerDelegate<RealizationGridSettings, GridMappedProperty_trans>;
    private _itemDelegate: ItemDelegate;

    constructor() {
        this._itemDelegate = new ItemDelegate("Realization Grid layer");
        this._layerDelegate = new LayerDelegate(this, new RealizationGridContext());
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getLayerDelegate(): LayerDelegate<RealizationGridSettings, GridMappedProperty_trans> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: RealizationGridSettings,
        newSettings: RealizationGridSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<GridMappedProperty_trans> {
        const settings = this.getSettingsContext().getDelegate().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const realizationNum = settings[SettingType.REALIZATION].getDelegate().getValue();
        const gridName = settings[SettingType.GRID_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.GRID_ATTRIBUTE].getDelegate().getValue();

        let timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();
        if (timeOrInterval === "NO_TIME") {
            timeOrInterval = null;
        }

        const queryKey = ["gridParameter", ensembleIdent, gridName, attribute, timeOrInterval, realizationNum];

        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () =>
                    apiService.grid3D.gridParameter(
                        ensembleIdent?.getCaseUuid() ?? "",
                        ensembleIdent?.getEnsembleName() ?? "",
                        gridName ?? "",
                        attribute ?? "",
                        realizationNum ?? 0,
                        timeOrInterval
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformGridMappedProperty(data));

        return promise;
    }
}
