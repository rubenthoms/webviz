import { SurfaceStatisticFunction_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { FullSurfaceAddress, SurfaceAddressBuilder } from "@modules/_shared/Surface";
import { SurfaceDataFloat_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { encodeSurfAddrStr } from "@modules/_shared/Surface/surfaceAddress";
import { BaseLayer, BoundingBox, LayerTopic } from "@modules/_shared/layers/BaseLayer";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";
import { SurfaceDataPng } from "src/api/models/SurfaceDataPng";

import { EnsembleStageType } from "../settings/components/ensembleStageSelect";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfaceLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    ensembleStage: EnsembleStageType;
    statisticFunction: SurfaceStatisticFunction_api;
    realizationNum: number | null;
    surfaceName: string | null;
    attribute: string | null;
};

export class SurfaceLayer extends BaseLayer<SurfaceLayerSettings, SurfaceDataFloat_trans | SurfaceDataPng> {
    private _colorSet: ColorSet;

    constructor(name: string, layerManager: LayerManager) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            statisticFunction: SurfaceStatisticFunction_api.MEAN,
            surfaceName: null,
            ensembleStage: EnsembleStageType.Realization,
            attribute: null,
            extensionLength: 0,
            resolution: 1,
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

        const minX = Number.MAX_VALUE;
        const maxX = Number.MIN_VALUE;
        const minY = Number.MAX_VALUE;
        const maxY = Number.MIN_VALUE;

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
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.attribute !== null &&
            this._settings.surfaceName !== null &&
            this._settings.realizationNum !== null
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: SurfaceLayerSettings,
        newSettings: SurfaceLayerSettings
    ): boolean {
        return (
            prevSettings.surfaceName !== newSettings.surfaceName ||
            prevSettings.attribute !== newSettings.attribute ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            prevSettings.ensembleStage !== newSettings.ensembleStage ||
            prevSettings.statisticFunction !== newSettings.statisticFunction ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent)
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<SurfaceDataFloat_trans | SurfaceDataPng> {
        super.setBoundingBox(null);

        let surfaceAddress: FullSurfaceAddress | null = null;
        const addrBuilder = new SurfaceAddressBuilder();

        if (this._settings.ensembleIdent && this._settings.surfaceName && this._settings.attribute) {
            addrBuilder.withEnsembleIdent(this._settings.ensembleIdent);
            addrBuilder.withName(this._settings.surfaceName);
            addrBuilder.withAttribute(this._settings.attribute);

            if (
                this._settings.ensembleStage === EnsembleStageType.Realization &&
                this._settings.realizationNum !== null
            ) {
                addrBuilder.withRealization(this._settings.realizationNum);
                surfaceAddress = addrBuilder.buildRealizationAddress();
            }
            if (this._settings.ensembleStage === EnsembleStageType.Statistics && this._settings.statisticFunction) {
                addrBuilder.withStatisticFunction(this._settings.statisticFunction);
                // TODO: Add realization filter
                surfaceAddress = addrBuilder.buildStatisticalAddress();
            }
            if (this._settings.ensembleStage === EnsembleStageType.Observation) {
                // addrBuilder.withRealization(this._settings.realizationNum);
                addrBuilder.withTimeOrInterval("2021-01-01T00:00:00Z");
                surfaceAddress = addrBuilder.buildObservedAddress();
            }
        }

        const surfAddrStr = surfaceAddress ? encodeSurfAddrStr(surfaceAddress) : null;

        const queryKey = ["getSurfaceData", surfAddrStr, null, "float"];

        this.registerQueryKey(queryKey);

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

export function isSurfaceLayer(layer: BaseLayer<any, any>): layer is SurfaceLayer {
    return layer instanceof SurfaceLayer;
}
