import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr, peekSurfaceAddressType } from "@modules/_shared/Surface/surfaceAddress";
import { BaseLayer, BoundingBox, LayerTopic } from "@modules/_shared/layers/BaseLayer";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";
import { SurfaceDataPng } from "src/api/models/SurfaceDataPng";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type WellboreLayerSettings = {
    wellboreUuids: string[];
    ensembleIdent: EnsembleIdent | null;
    fieldIdentifier: string | null;
};

export class WellboreLayer extends BaseLayer<WellboreLayerSettings, WellboreTrajectory_api[]> {
    private _colorSet: ColorSet;

    constructor(name: string, layerManager: LayerManager) {
        const defaultSettings = {
            wellboreUuids: [],
            ensembleIdent: null,
            fieldIdentifier: null,
        };
        super(name, defaultSettings, layerManager);

        this._colorSet = new ColorSet(defaultColorPalettes[0]);
    }

    getColorSet(): ColorSet {
        return this._colorSet;
    }

    setColorSet(colorSet: ColorSet): void {
        this._colorSet = colorSet;
        this.notifySubscribers(LayerTopic.DATA);
    }

    private makeBoundingBox(): void {
        if (!this._data) {
            return;
        }

        let minX = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;

        this._data.forEach((trajectory) => {
            minX = Math.min(minX, ...trajectory.eastingArr);
            maxX = Math.max(maxX, ...trajectory.eastingArr);
            minY = Math.min(minY, ...trajectory.northingArr);
            maxY = Math.max(maxY, ...trajectory.northingArr);
        });

        super.setBoundingBox({
            x: [minX, maxX],
            y: [minY, maxY],
            z: [0, 0],
        });

        super.setBoundingBox({
            x: [minX, maxX],
            y: [minY, maxY],
            z: [0, 0],
        });
    }

    getBoundingBox(): BoundingBox | null {
        const bbox = super.getBoundingBox();
        if (bbox) {
            return bbox;
        }

        this.makeBoundingBox();
        return super.getBoundingBox();
    }

    protected areSettingsValid(): boolean {
        return true;
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: WellboreLayerSettings,
        newSettings: WellboreLayerSettings
    ): boolean {
        return !isEqual(prevSettings.wellboreUuids, newSettings.wellboreUuids);
    }

    protected async fetchData(queryClient: QueryClient): Promise<WellboreTrajectory_api[]> {
        const promises: Promise<SurfaceDataFloat_trans | SurfaceDataPng>[] = [];

        super.setBoundingBox(null);

        const queryKey = ["getWellTrajectories", this._settings.fieldIdentifier];
        this.registerQueryKey(queryKey);
        const promise = queryClient.fetchQuery({
            queryKey,
            queryFn: () => apiService.well.getFieldWellTrajectories(this._settings.fieldIdentifier ?? ""),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });

        return promise;
    }
}

export function isWellboreLayer(layer: BaseLayer<any, any>): layer is WellboreLayer {
    return layer instanceof WellboreLayer;
}
