import type {
    FenceMeshSection_api,
    Grid3dGeometry_api,
    Grid3dLayerCellProperties_api,
    Grid3dLayerCornerGeometry_api,
    Grid3dMappedProperty_api,
    Grid3dPillarGeometry_api,
    PolylineIntersection_api,
} from "@api";
import {
    b64DecodeFloatArrayToFloat32,
    b64DecodeUintArrayToUint32,
    b64DecodeUintArrayToUint32OrLess,
    b64DecodeUintArrayToUint8,
} from "@modules_shared/base64";

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

// Provisional wire format -- see webviz_services.grid3d_pillar_geometry on the backend.
// This only decodes the base64 transport encoding; the shape below is still exactly the
// current wire format (pillars/corner_t/split-quadrants) otherwise. It is NOT the stable
// boundary consumers should depend on -- that's a further adapter (not yet written) that
// builds the internal calculation-ready geometry from this. If the wire format changes,
// this type and that adapter change together; nothing downstream of the adapter should.
export type GridPillarGeometry_trans = Omit<Grid3dPillarGeometry_api, "pillars_b64arr"> & {
    pillarsFloat32Arr: Float32Array;
};

export function transformGridPillarGeometry(apiData: Grid3dPillarGeometry_api): GridPillarGeometry_trans {
    const { pillars_b64arr, ...untransformedData } = apiData;
    const pillarsFloat32Arr = b64DecodeFloatArrayToFloat32(pillars_b64arr);

    return {
        ...untransformedData,
        pillarsFloat32Arr: pillarsFloat32Arr,
    };
}

export type GridLayerCornerGeometry_trans = Omit<
    Grid3dLayerCornerGeometry_api,
    "corner_t_b64arr" | "split_indices_b64arr" | "split_corner_t_b64arr" | "active_b64arr"
> & {
    cornerTFloat32Arr: Float32Array;
    splitIndicesUint32Arr: Uint32Array;
    splitCornerTFloat32Arr: Float32Array;
    activeUint8Arr: Uint8Array;
};

export function transformGridLayerCornerGeometry(
    apiData: Grid3dLayerCornerGeometry_api,
): GridLayerCornerGeometry_trans {
    const { corner_t_b64arr, split_indices_b64arr, split_corner_t_b64arr, active_b64arr, ...untransformedData } =
        apiData;

    const cornerTFloat32Arr = b64DecodeFloatArrayToFloat32(corner_t_b64arr);
    const splitIndicesUint32Arr = b64DecodeUintArrayToUint32(split_indices_b64arr);
    const splitCornerTFloat32Arr = b64DecodeFloatArrayToFloat32(split_corner_t_b64arr);
    const activeUint8Arr = b64DecodeUintArrayToUint8(active_b64arr);

    return {
        ...untransformedData,
        cornerTFloat32Arr: cornerTFloat32Arr,
        splitIndicesUint32Arr: splitIndicesUint32Arr,
        splitCornerTFloat32Arr: splitCornerTFloat32Arr,
        activeUint8Arr: activeUint8Arr,
    };
}

export type GridLayerCellProperties_trans = Omit<Grid3dLayerCellProperties_api, "cell_props_b64arr_by_name"> & {
    cellPropsFloat32ArrByName: Record<string, Float32Array>;
};

export function transformGridLayerCellProperties(apiData: Grid3dLayerCellProperties_api): GridLayerCellProperties_trans {
    const { cell_props_b64arr_by_name, ...untransformedData } = apiData;

    const cellPropsFloat32ArrByName: Record<string, Float32Array> = {};
    for (const [name, b64arr] of Object.entries(cell_props_b64arr_by_name)) {
        cellPropsFloat32ArrByName[name] = b64DecodeFloatArrayToFloat32(b64arr);
    }

    return {
        ...untransformedData,
        cellPropsFloat32ArrByName: cellPropsFloat32ArrByName,
    };
}

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
