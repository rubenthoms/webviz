import { FenceMeshSection_api, Grid3dGeometry_api, Grid3dMappedProperty_api, PolylineIntersection_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { defaultContinuousSequentialColorPalettes } from "@framework/utils/colorPalettes";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { pointDistance } from "@lib/utils/geometry";
import {
    b64DecodeFloatArrayToFloat32,
    b64DecodeUintArrayToUint32,
    b64DecodeUintArrayToUint32OrLess,
} from "@modules/_shared/base64";
import { ColorScaleWithName } from "@modules/_shared/utils/ColorScaleWithName";
import { QueryClient } from "@tanstack/query-core";

import { isEqual } from "lodash";

import { BaseLayer, BoundingBox, LayerTopic } from "./BaseLayer";

// Data structure for the transformed GridSurface data
// Removes the base64 encoded data and replaces them with typed arrays
export type GridSurface_trans = Omit<
    Grid3dGeometry_api,
    "points_b64arr" | "polys_b64arr" | "poly_source_cell_indices_b64arr"
> & {
    pointsFloat32Arr: Float32Array;
    polysUint32Arr: Uint32Array;
    polySourceCellIndicesUint32Arr: Uint32Array;
};

export function transformGridSurface(apiData: Grid3dGeometry_api): GridSurface_trans {
    const startTS = performance.now();

    const { points_b64arr, polys_b64arr, poly_source_cell_indices_b64arr, ...untransformedData } = apiData;
    const pointsFloat32Arr = b64DecodeFloatArrayToFloat32(points_b64arr);
    const polysUint32Arr = b64DecodeUintArrayToUint32(polys_b64arr);
    const polySourceCellIndicesUint32Arr = b64DecodeUintArrayToUint32(poly_source_cell_indices_b64arr);

    console.debug(`transformGridSurface() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        pointsFloat32Arr: pointsFloat32Arr,
        polysUint32Arr: polysUint32Arr,
        polySourceCellIndicesUint32Arr: polySourceCellIndicesUint32Arr,
    };
}

export type GridMappedProperty_trans = Omit<Grid3dMappedProperty_api, "poly_props_b64arr"> & {
    polyPropsFloat32Arr: Float32Array;
};

export function transformGridMappedProperty(apiData: Grid3dMappedProperty_api): GridMappedProperty_trans {
    const startTS = performance.now();

    const { poly_props_b64arr, ...untransformedData } = apiData;
    const polyPropsFloat32Arr = b64DecodeFloatArrayToFloat32(poly_props_b64arr);

    console.debug(`transformGridProperty() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        polyPropsFloat32Arr: polyPropsFloat32Arr,
    };
}

export type FenceMeshSection_trans = Omit<
    FenceMeshSection_api,
    | "vertices_uz_b64arr"
    | "poly_indices_b64arr"
    | "vertices_per_poly_b64arr"
    | "poly_source_cell_indices_b64arr"
    | "poly_props_b64arr"
> & {
    verticesUzFloat32Arr: Float32Array;
    polyIndicesUintArr: Uint32Array | Uint16Array | Uint8Array;
    verticesPerPolyUintArr: Uint32Array | Uint16Array | Uint8Array;
    polySourceCellIndicesUint32Arr: Uint32Array;
    polyPropsFloat32Arr: Float32Array;
};

export type PolylineIntersection_trans = Omit<PolylineIntersection_api, "fence_mesh_sections"> & {
    fenceMeshSections: Array<FenceMeshSection_trans>;
};

function transformFenceMeshSection(apiData: FenceMeshSection_api): FenceMeshSection_trans {
    const {
        vertices_uz_b64arr,
        poly_indices_b64arr,
        vertices_per_poly_b64arr,
        poly_source_cell_indices_b64arr,
        poly_props_b64arr,
        ...untransformedData
    } = apiData;

    const verticesUzFloat32Arr = b64DecodeFloatArrayToFloat32(vertices_uz_b64arr);
    const polyIndicesUintArr = b64DecodeUintArrayToUint32OrLess(poly_indices_b64arr);
    const verticesPerPolyUintArr = b64DecodeUintArrayToUint32OrLess(vertices_per_poly_b64arr);
    const polySourceCellIndicesUint32Arr = b64DecodeUintArrayToUint32(poly_source_cell_indices_b64arr);
    const polyPropsFloat32Arr = b64DecodeFloatArrayToFloat32(poly_props_b64arr);

    return {
        ...untransformedData,
        verticesUzFloat32Arr: verticesUzFloat32Arr,
        polyIndicesUintArr: polyIndicesUintArr,
        verticesPerPolyUintArr: verticesPerPolyUintArr,
        polySourceCellIndicesUint32Arr: polySourceCellIndicesUint32Arr,
        polyPropsFloat32Arr: polyPropsFloat32Arr,
    };
}

export function transformPolylineIntersection(apiData: PolylineIntersection_api): PolylineIntersection_trans {
    const startTS = performance.now();

    const { fence_mesh_sections, ...untransformedData } = apiData;

    const transMeshSections: FenceMeshSection_trans[] = [];

    for (const apiSection of fence_mesh_sections) {
        const transformedSection = transformFenceMeshSection(apiSection);
        transMeshSections.push(transformedSection);
    }

    console.debug(`transformPolylineIntersection() took: ${(performance.now() - startTS).toFixed(1)}ms`);

    return {
        ...untransformedData,
        fenceMeshSections: transMeshSections,
    };
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export type GridLayerSettings = {
    ensembleIdent: EnsembleIdent | null;
    gridModelName: string | null;
    parameterName: string | null;
    parameterDateOrInterval: string | null;
    realizationNum: number | null;
    polylineXyz: number[];
    showMesh: boolean;
    extensionLength: number | null;
};

export class GridLayer extends BaseLayer<GridLayerSettings, PolylineIntersection_trans> {
    private _colorScalesParameterMap: Map<string, ColorScale> = new Map();
    private _useCustomColorScaleBoundariesParameterMap = new Map<string, boolean>();
    private _defaultColorScale: ColorScale;

    constructor(name: string, queryClient: QueryClient) {
        const defaultSettings = {
            ensembleIdent: null,
            gridModelName: null,
            parameterName: null,
            parameterDateOrInterval: null,
            realizationNum: null,
            polylineXyz: [],
            showMesh: false,
            extensionLength: null,
        };
        super(name, defaultSettings, queryClient);

        this._defaultColorScale = new ColorScale({
            colorPalette: defaultContinuousSequentialColorPalettes[0],
            gradientType: ColorScaleGradientType.Sequential,
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    getColorScale(): ColorScaleWithName {
        let colorScale = this._defaultColorScale;
        if (this._settings.parameterName !== null) {
            colorScale = this._colorScalesParameterMap.get(this._settings.parameterName) ?? this._defaultColorScale;
        }
        return ColorScaleWithName.fromColorScale(colorScale, this._settings.parameterName ?? super.getName());
    }

    setColorScale(colorScale: ColorScale): void {
        if (this._settings.parameterName === null) {
            return;
        }

        this.notifySubscribers(LayerTopic.DATA);
        this._colorScalesParameterMap.set(this._settings.parameterName ?? "", colorScale);
    }

    makeBoundingBox(): void {
        if (!this._data || !this._settings.extensionLength) {
            return;
        }

        const minX = -this._settings.extensionLength;
        let maxX = -this._settings.extensionLength;
        let minY = Number.MAX_VALUE;
        let maxY = Number.MIN_VALUE;

        for (const section of this._data.fenceMeshSections) {
            const uVectorLength = pointDistance(
                {
                    x: section.start_utm_x,
                    y: section.start_utm_y,
                },
                {
                    x: section.end_utm_x,
                    y: section.end_utm_y,
                }
            );
            maxX += uVectorLength;

            minY = Math.min(
                minY,
                section.verticesUzFloat32Arr.reduce(
                    (acc, val, idx) => (idx % 2 === 1 ? Math.min(acc, -val) : acc),
                    Number.MAX_VALUE
                )
            );
            maxY = Math.max(
                maxY,
                section.verticesUzFloat32Arr.reduce(
                    (acc, val, idx) => (idx % 2 === 1 ? Math.max(acc, -val) : acc),
                    Number.MIN_VALUE
                )
            );
        }

        super.setBoundingBox({
            x: [minX, maxX],
            y: [minY, maxY],
            z: [0, 0],
        });
    }

    protected doSettingsChangesRequireDataRefetch(
        prevSettings: GridLayerSettings,
        newSettings: GridLayerSettings
    ): boolean {
        return (
            !isEqual(prevSettings.ensembleIdent, newSettings.ensembleIdent) ||
            prevSettings.gridModelName !== newSettings.gridModelName ||
            prevSettings.parameterName !== newSettings.parameterName ||
            prevSettings.parameterDateOrInterval !== newSettings.parameterDateOrInterval ||
            prevSettings.realizationNum !== newSettings.realizationNum ||
            !isEqual(prevSettings.polylineXyz, newSettings.polylineXyz) ||
            prevSettings.extensionLength !== newSettings.extensionLength
        );
    }

    getBoundingBox(): BoundingBox | null {
        const bbox = super.getBoundingBox();
        if (bbox) {
            return bbox;
        }

        this.makeBoundingBox();
        return super.getBoundingBox();
    }

    getUseCustomColorScaleBoundaries(): boolean {
        return this._useCustomColorScaleBoundariesParameterMap.get(this._settings.parameterName ?? "") ?? false;
    }

    setUseCustomColorScaleBoundaries(useCustomColorScaleBoundaries: boolean): void {
        this._useCustomColorScaleBoundariesParameterMap.set(
            this._settings.parameterName ?? "",
            useCustomColorScaleBoundaries
        );
        this.notifySubscribers(LayerTopic.DATA);
    }

    protected areSettingsValid(): boolean {
        return (
            this._settings.ensembleIdent !== null &&
            this._settings.gridModelName !== null &&
            this._settings.parameterName !== null &&
            this._settings.realizationNum !== null &&
            this._settings.polylineXyz.length > 0 &&
            this._settings.extensionLength !== null
        );
    }

    protected async fetchData(): Promise<PolylineIntersection_trans> {
        super.setBoundingBox(null);

        return this._queryClient
            .fetchQuery({
                queryKey: ["getGridPolylineIntersection", ...Object.entries(this._settings)],
                queryFn: () =>
                    apiService.grid3D.postGetPolylineIntersection(
                        this._settings.ensembleIdent?.getCaseUuid() ?? "",
                        this._settings.ensembleIdent?.getEnsembleName() ?? "",
                        this._settings.gridModelName ?? "",
                        this._settings.parameterName ?? "",
                        this._settings.realizationNum ?? 0,
                        { polyline_utm_xy: this._settings.polylineXyz },
                        this._settings.parameterDateOrInterval
                    ),
                staleTime: STALE_TIME,
                gcTime: CACHE_TIME,
            })
            .then((data) => transformPolylineIntersection(data));
    }
}

export function isGridLayer(layer: BaseLayer<any, any>): layer is GridLayer {
    return layer instanceof GridLayer;
}
