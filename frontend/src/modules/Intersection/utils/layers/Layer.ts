import { apiService } from "@framework/ApiService";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";
import { ColorScaleWithName } from "@modules/Intersection/view/utils/ColorScaleWithName";
import { QueryClient } from "@tanstack/react-query";

import { Grid3dGeometry_api, Grid3dMappedProperty_api } from "@api";
import { FenceMeshSection_api, PolylineIntersection_api } from "@api";
import { b64DecodeFloatArrayToFloat32 } from "@modules_shared/base64";
import { b64DecodeUintArrayToUint32, b64DecodeUintArrayToUint32OrLess } from "@modules_shared/base64";

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


export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
}

export interface Layer<TData> {
    getStatus(): LayerStatus;
    getName(): string;
    getIsVisible(): boolean;
    getColorScale(): ColorScaleWithName;
    getData(): TData | null;
}

type GridLayerSettings = {
    caseUuid: string;
    ensembleName: string;
    gridName: string;
    parameterName: string;
    realizationNum: number;
    polylineXyz: number[];
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

const DefaultGridLayerSettings = {
    caseUuid: "",
    ensembleName: "",
    gridName: "",
    parameterName: "",
    realizationNum: 0,
    polylineXyz: [],
};

export class GridLayer implements Layer<PolylineIntersection_trans> {
    private _status: LayerStatus = LayerStatus.IDLE;
    private _name: string = "";
    private _isVisible: boolean = true;
    private _colorScale: ColorScale;
    private _queryClient: QueryClient;
    private _settings: GridLayerSettings = DefaultGridLayerSettings;
    private _data: PolylineIntersection_trans | null = null;

    constructor(queryClient: QueryClient) {
        this._queryClient = queryClient;

        this._colorScale = new ColorScale({
            colorPalette: new ColorPalette({
                name: "Blue to Yellow",
                colors: [
                    "#115f9a",
                    "#1984c5",
                    "#22a7f0",
                    "#48b5c4",
                    "#76c68f",
                    "#a6d75b",
                    "#c9e52f",
                    "#d0ee11",
                    "#f4f100",
                ],
                id: "blue-to-yellow",
            }),
            gradientType: ColorScaleGradientType.Sequential,
            type: ColorScaleType.Continuous,
            steps: 10,
        });
    }

    getStatus(): LayerStatus {
        return this._status;
    }

    getName(): string {
        return this._name;
    }

    getIsVisible(): boolean {
        return this._isVisible;
    }

    getColorScale(): ColorScaleWithName {
        return ColorScaleWithName.fromColorScale(this._colorScale, this._name);
    }

    updateSettings(updatedSettings: Partial<GridLayerSettings>): void {
        this._settings = { ...this._settings, ...updatedSettings };
    }

    async fetchData() {
        this._status = LayerStatus.LOADING;

        this._queryClient.fetchQuery({
            queryKey: ["getGridPolylineIntersection",
            this._settings.caseUuid,
            this._settings.ensembleName,
            this._settings.gridName,
            this._settings.parameterName,
            this._settings.realizationNum,
            this._settings.polylineXyz],
            queryFn: () => apiService.grid3D.postGetPolylineIntersection(
                this._settings.caseUuid ?? "",
                this._settings.ensembleName ?? "",
                this._settings.gridName ?? "",
                this._settings.parameterName ?? "",
                this._settings.realizationNum ?? 0,
                { polyline_utm_xy: this._settings.polylineXyz }
            ),
            staleTime: STALE_TIME,
            gcTime: CACHE_TIME,
        }).then((data) => {
            return transformPolylineIntersection(data);
        }

        this._status = LayerStatus.SUCCESS;
    }

    getData(): PolylineIntersection_trans | null {
        return null;
    }
}
