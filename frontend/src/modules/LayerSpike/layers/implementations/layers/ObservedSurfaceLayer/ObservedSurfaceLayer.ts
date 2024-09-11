import { SurfaceDataPng_api, SurfaceTimeType_api } from "@api";
import { apiService } from "@framework/ApiService";
import { SettingType } from "@modules/LayerSpike/layers/Settings";
import { CACHE_TIME, STALE_TIME } from "@modules/LayerSpike/layers/queryConstants";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { QueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

import { ObservedSurfaceContext } from "./ObservedSurfaceContext";
import { ObservedSurfaceSettings } from "./types";

import { LayerDelegate } from "../../../LayerDelegate";
import { Layer } from "../../../interfaces";

export class ObservedSurfaceLayer
    implements Layer<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>
{
    private _layerDelegate: LayerDelegate<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api>;

    constructor() {
        this._layerDelegate = new LayerDelegate(this, "ObservedSurface", new ObservedSurfaceContext());
    }

    getId() {
        return this._layerDelegate.getId();
    }

    getName() {
        return this._layerDelegate.getName();
    }

    getSettingsContext() {
        return this._layerDelegate.getSettingsContext();
    }

    getDelegate(): LayerDelegate<ObservedSurfaceSettings, SurfaceDataFloat_trans | SurfaceDataPng_api> {
        return this._layerDelegate;
    }

    doSettingsChangesRequireDataRefetch(
        prevSettings: ObservedSurfaceSettings,
        newSettings: ObservedSurfaceSettings
    ): boolean {
        return !isEqual(prevSettings, newSettings);
    }

    fechData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng_api> {
        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        const settings = this.getSettingsContext().getSettings();
        const ensembleIdent = settings[SettingType.ENSEMBLE].getDelegate().getValue();
        const surfaceName = settings[SettingType.SURFACE_NAME].getDelegate().getValue();
        const attribute = settings[SettingType.SURFACE_ATTRIBUTE].getDelegate().getValue();
        const timeOrInterval = settings[SettingType.TIME_OR_INTERVAL].getDelegate().getValue();

        if (ensembleIdent && surfaceName && attribute && timeOrInterval) {
            addrBuilder.withEnsembleIdent(ensembleIdent);
            addrBuilder.withName(surfaceName);
            addrBuilder.withAttribute(attribute);
            addrBuilder.withTimeOrInterval(timeOrInterval);

            surfaceAddress = addrBuilder.buildObservedAddress();
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryKey = ["getSurfaceData", surfAddrStr, null, "float"];

        this._layerDelegate.registerQueryKey(queryKey);

        const promise = queryClient
            .fetchQuery({
                queryKey,
                queryFn: () => apiService.surface.getSurfaceData(surfAddrStr ?? "", "float", null),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformSurfaceData(data));

        return promise;
    }
}
