import { PolylineIntersectionData } from "@modules/_shared/components/EsvIntersection/PolylineIntersectionLayer";

import {
    casingData,
    cementData,
    cementSqueezes,
    completion,
    holeSizeData,
    picks,
    polylineIntersection,
    poslog,
    seismic,
    stratColumns,
    surfaces,
} from "./";

export const getWellborePath = (): Promise<any> => {
    const coords = poslog.map((c: any) => [c.easting, c.northing, c.tvd]);
    return Promise.resolve(coords);
};

export const getPositionLog = (): Promise<any> => {
    return Promise.resolve(poslog);
};

export const getCompletion = (): Promise<any[]> => {
    return Promise.resolve(completion);
};

export const getSurfaces = (): Promise<any[]> => {
    return Promise.resolve(surfaces);
};

export const getStratColumns = (): Promise<any[]> => {
    return Promise.resolve(stratColumns);
};

export const getSeismic = (): Promise<any> => {
    return Promise.resolve(seismic);
};

export const getHolesize = (): Promise<any[]> => {
    return Promise.resolve(holeSizeData);
};

export const getCasings = (): Promise<any[]> => {
    return Promise.resolve(casingData);
};

export const getCement = (): Promise<any[]> => {
    return Promise.resolve(cementData);
};

export const getPicks = (): Promise<any[]> => {
    return Promise.resolve(picks);
};

export const getCementSqueezes = (): Promise<any[]> => {
    return Promise.resolve(cementSqueezes);
};

export const getPolyLineIntersection = (): Promise<PolylineIntersectionData> => {
    let cellIndex = 0;
    const adjustedPolylineIntersection = {
        fenceMeshSections: polylineIntersection.fence_mesh_sections.map((section: any) => {
            const values: number[] = [];
            const cellIndices: number[] = [];

            let minZ = Number.MAX_VALUE;
            let maxZ = Number.MIN_VALUE;

            let idx = 0;
            while (idx < section.polys_arr.length) {
                values.push(Math.random() * 1000);
                idx += section.polys_arr[idx] + 1;
                cellIndices.push(cellIndex++);
            }

            const adjustedVerticesUzArr: number[] = [];
            for (const [index, vertice] of section.vertices_uz_arr.entries()) {
                adjustedVerticesUzArr.push(index % 2 === 0 ? vertice : -vertice);
                if (index % 2 !== 0) {
                    minZ = Math.min(minZ, -vertice);
                    maxZ = Math.max(maxZ, -vertice);
                }
            }

            return {
                verticesUzArr: new Float32Array(
                    section.vertices_uz_arr.map((el: number, i: number) => (i % 2 === 0 ? el : -el))
                ),
                polysArr: new Uint32Array(section.polys_arr),
                polySourceCellIndicesArr: Uint32Array.from(cellIndices), // new Uint32Array(section.poly_source_cell_indices_arr),
                polyPropsArr: Float32Array.from(values), // new Float64Array(section.poly_props_arr),
                startUtmX: section.start_utm_x,
                startUtmY: section.start_utm_y,
                endUtmX: section.end_utm_x,
                endUtmY: section.end_utm_y,
                minZ,
                maxZ,
            };
        }),
        minGridPropValue: 0, // polylineIntersection.min_grid_prop_value,
        maxGridPropValue: 1000, // polylineIntersection.max_grid_prop_value,
    };
    return Promise.resolve(adjustedPolylineIntersection);
};
