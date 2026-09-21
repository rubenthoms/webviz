import type { GridMappedProperty_trans, GridSurface_trans } from "@modules/_shared/utils/queryDataTransforms";

export type RealizationGridData = {
    gridSurfaceData: GridSurface_trans;
    gridParameterData: GridMappedProperty_trans;
};

// Assembled, render-ready grid-cell debug/sanity-check data -- see
// @modules/_shared/Grid3d for the pieces this is built from (corner
// reconstruction, poly->cell collapse). This is the stable shape the
// layer depends on; it should not need to change if the wire format
// (pillars/corner_t, or getGridParameter) does.
export type GridCellFluxPhaseFlux = {
    iFaceFlux: Float32Array; // length nx*ny, flat index j*nx+i -- entry i is cell i's I+ face
    jFaceFlux: Float32Array; // length nx*ny, flat index j*nx+i -- entry j is cell j's J+ face
    kFaceFlux: Float32Array; // length nx*ny, flat index j*nx+i -- entry k is this cell's K+ face
};

export type GridCellFluxData = {
    nx: number;
    ny: number;
    k: number;

    // Raw pillars (origin-relative XY + absolute Z, two endpoints per pillar), for the
    // simplest possible sanity-check rendering -- straight from the wire data, no
    // corner reconstruction or split-quadrant logic involved.
    pillarsFloat32Arr: Float32Array; // length (nx+1)*(ny+1)*6
    originUtmX: number;
    originUtmY: number;

    // One hexahedron (8 corners x xyz) per cell, flat cell index j*nx+i.
    cellCornersFloat32Arr: Float32Array; // length nx*ny*24

    activeUint8Arr: Uint8Array; // length nx*ny

    phaseFlux: Partial<Record<"oil" | "gas" | "water", GridCellFluxPhaseFlux>>;
};
