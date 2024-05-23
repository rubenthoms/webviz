import { SurfaceIntersectionData_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorSet } from "@lib/utils/ColorSet";
import { QueryClient } from "@tanstack/query-core";

import { BaseLayer, LayerTopic } from "./BaseLayer";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type SurfaceLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    realizationNum: number | null;
    intersectionReferenceSystem: IntersectionReferenceSystem | null;
    surfaceNames: string[];
    attribute: string | null;
    extensionLength: number;
};

export class SurfaceLayer extends BaseLayer<SurfaceLayerSettings, SurfaceIntersectionData_api[]> {
    private _colorSet: ColorSet;

    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            realizationNum: null,
            intersectionReferenceSystem: null,
            surfaceNames: [],
            attribute: null,
            polylineXyz: [],
            extensionLength: 0,
        };
        super(name, defaultSettings, queryClient);

        this._colorSet = new ColorSet(defaultColorPalettes[0]);
    }

    getColorSet(): ColorSet {
        return this._colorSet;
    }

    setColorSet(colorSet: ColorSet): void {
        this._colorSet = colorSet;
        this.notifySubscribers(LayerTopic.DATA);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.attribute !== null &&
            this._settings.surfaceNames.length > 0 &&
            this._settings.realizationNum !== null &&
            this._settings.intersectionReferenceSystem !== null
        );
    }

    protected async fetchData(): Promise<SurfaceIntersectionData_api[]> {
        const promises: Promise<SurfaceIntersectionData_api>[] = [];

        if (!this._settings.intersectionReferenceSystem) {
            throw new Error("No intersection reference system set");
        }

        const trajectory = this._settings.intersectionReferenceSystem.getExtendedTrajectory(
            1000,
            this._settings.extensionLength,
            this._settings.extensionLength
        );

        const curtainProjection = IntersectionReferenceSystem.toDisplacement(trajectory.points, trajectory.offset);

        const xPoints: number[] = [];
        const yPoints: number[] = [];
        const cumulatedHorizontalPolylineLength: number[] = [];
        for (let i = 0; i < trajectory.points.length; i++) {
            xPoints.push(trajectory.points[i][0]);
            yPoints.push(trajectory.points[i][1]);
            cumulatedHorizontalPolylineLength.push(curtainProjection[i][0] - this._settings.extensionLength);
        }

        const queryBody = {
            cumulative_length_polyline: {
                x_points: xPoints,
                y_points: yPoints,
                cum_lengths: cumulatedHorizontalPolylineLength,
            },
        };

        for (const surfaceName of this._settings.surfaceNames) {
            const promise = this._queryClient.fetchQuery({
                queryKey: [
                    "getSurfaceIntersection",
                    this._settings.ensembleIdent?.getCaseUuid() ?? "",
                    this._settings.ensembleIdent?.getEnsembleName() ?? "",
                    this._settings.realizationNum ?? 0,
                    surfaceName,
                    this._settings.attribute ?? "",
                    queryBody,
                ],
                queryFn: () =>
                    apiService.surface.postGetSurfaceIntersection(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.ensembleIdent?.getEnsembleName() ?? "",
                        this._settings.realizationNum ?? 0,
                        surfaceName,
                        this._settings.attribute ?? "",
                        queryBody
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            });
            promises.push(promise);
        }

        return Promise.all(promises);
    }
}

export function isSurfaceLayer(layer: BaseLayer<any, any>): layer is SurfaceLayer {
    return layer instanceof SurfaceLayer;
}
