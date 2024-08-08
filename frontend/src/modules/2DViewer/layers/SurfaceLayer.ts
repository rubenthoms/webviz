import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { SurfaceData_trans, transformSurfaceData } from "@modules/_shared/Surface/queryDataTransforms";
import { BaseLayer, BoundingBox, LayerTopic } from "@modules/_shared/layers/BaseLayer";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfaceLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    surfaceNames: string[];
    attribute: string | null;
};

export class SurfaceLayer extends BaseLayer<SurfaceLayerSettings, SurfaceData_trans[]> {
    private _colorSet: ColorSet;

    constructor(name: string) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            polyline: {
                polylineUtmXy: [],
                actualSectionLengths: [],
            },
            surfaceNames: [],
            attribute: null,
            extensionLength: 0,
            resolution: 1,
        };
        super(name, defaultSettings);

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
            this._settings.surfaceNames.length > 0 &&
            this._settings.realizationNum !== null
        );
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: SurfaceLayerSettings,
        newSettings: SurfaceLayerSettings
    ): boolean {
        return (
            !isEqual(prevSettings.surfaceNames, newSettings.surfaceNames) ||
            prevSettings.attribute !== newSettings.attribute ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent)
        );
    }

    protected async fetchData(queryClient: QueryClient): Promise<SurfaceData_trans[]> {
        const promises: Promise<SurfaceData_trans>[] = [];

        super.setBoundingBox(null);

        for (const surfaceName of this._settings.surfaceNames) {
            const queryKey = [
                "getSurfaceIntersection",
                this._settings.ensembleIdent?.getCaseUuid() ?? "",
                this._settings.ensembleIdent?.getEnsembleName() ?? "",
                this._settings.realizationNum ?? 0,
                surfaceName,
                this._settings.attribute ?? "",
            ];
            this.registerQueryKey(queryKey);

            const promise = queryClient
                .fetchQuery({
                    queryKey,
                    queryFn: () =>
                        apiService.surface.getRealizationSurfaceData(
                            this._settings.ensembleIdent?.getCaseUuid() ?? "",
                            this._settings.ensembleIdent?.getEnsembleName() ?? "",
                            this._settings.realizationNum ?? 0,
                            surfaceName,
                            this._settings.attribute ?? "",
                            undefined
                        ),
                    staleTime: STALE_TIME,
                    gcTime: CACHE_TIME,
                })
                .then((data) => transformSurfaceData(data));
            promises.push(promise);
        }

        return Promise.all(promises);
    }
}

export function isSurfaceLayer(layer: BaseLayer<any, any>): layer is SurfaceLayer {
    return layer instanceof SurfaceLayer;
}
