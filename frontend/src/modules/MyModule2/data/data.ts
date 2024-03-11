import { GridIntersectionData } from "@modules/_shared/components/EsvIntersection/GridIntersectionLayer";

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

export const getPolyLineIntersection = (): Promise<GridIntersectionData> => {
    const adjustedPolylineIntersection = {
        fenceMeshSections: polylineIntersection.fence_mesh_sections.map((section: any) => {
            return {
                verticesUzArr: new Float64Array(section.vertices_uz_arr),
                polysArr: new Uint32Array(section.polys_arr),
                polySourceCellIndicesArr: new Uint32Array(section.poly_source_cell_indices_arr),
                polyPropsArr: new Float64Array(section.poly_props_arr),
                startUtmX: section.start_utm_x,
                startUtmY: section.start_utm_y,
                endUtmX: section.end_utm_x,
                endUtmY: section.end_utm_y,
            };
        }),
        minGridPropValue: polylineIntersection.min_grid_prop_value,
        maxGridPropValue: polylineIntersection.max_grid_prop_value,
    };
    return Promise.resolve(adjustedPolylineIntersection);
};
