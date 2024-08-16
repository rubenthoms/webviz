import { PolygonData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { BaseLayer, BoundingBox, LayerTopic } from "@modules/_shared/layers/BaseLayer";
import { LayerManager } from "@modules/_shared/layers/LayerManager";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type FaultPolygonLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    polygonName: string | null;
    attribute: string | null;
};

export class FaultPolygonLayer extends BaseLayer<FaultPolygonLayerSettings, PolygonData_api[]> {
    private _colorSet: ColorSet;

    constructor(name: string, layerManager: LayerManager) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            polyline: {
                polylineUtmXy: [],
                actualSectionLengths: [],
            },
            polygonName: null,
            attribute: null,
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
            this._settings.polygonName !== null &&
            this._settings.realizationNum !== null
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: FaultPolygonLayerSettings,
        newSettings: FaultPolygonLayerSettings
    ): boolean {
        return (
            !isEqual(prevSettings.polygonName, newSettings.polygonName) ||
            prevSettings.attribute !== newSettings.attribute ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent)
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<PolygonData_api[]> {
        // super.setBoundingBox(null);

        const queryKey = [
            "getPolygonsData",
            this._settings.ensembleIdent?.getCaseUuid() ?? "",
            this._settings.ensembleIdent?.getEnsembleName() ?? "",
            this._settings.realizationNum ?? 0,
            this._settings.polygonName ?? "",
            this._settings.attribute ?? "",
        ];
        this.registerQueryKey(queryKey);

        return queryClient.fetchQuery({
            queryKey,
            queryFn: () =>
                apiService.polygons.getPolygonsData(
                    this._settings.ensembleIdent?.getCaseUuid() ?? "",
                    this._settings.ensembleIdent?.getEnsembleName() ?? "",
                    this._settings.realizationNum ?? 0,
                    this._settings.polygonName ?? "",
                    this._settings.attribute ?? ""
                ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        });
    }
}

export function isFaultPolygonLayer(layer: BaseLayer<any, any>): layer is FaultPolygonLayer {
    return layer instanceof FaultPolygonLayer;
}
