import { PolygonData_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { BaseItem } from "@modules/_shared/layers/BaseItem";
import { BaseLayer, BoundingBox } from "@modules/_shared/layers/BaseLayer";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type PolygonLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    polygonName: string | null;
    attribute: string | null;
    color: string;
};

export class PolygonLayer extends BaseLayer<PolygonLayerSettings, PolygonData_api[]> {
    constructor(name: string, parent: BaseItem) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            polyline: {
                polylineUtmXy: [],
                actualSectionLengths: [],
            },
            polygonName: null,
            attribute: null,
            color: "#FF0000",
        };
        super(name, defaultSettings, parent);
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
        prevSettings: PolygonLayerSettings,
        newSettings: PolygonLayerSettings
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

export function isPolygonLayer(layer: BaseLayer<any, any>): layer is PolygonLayer {
    return layer instanceof PolygonLayer;
}
