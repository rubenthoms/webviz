import type { GridLayerCornerGeometry_trans, GridPillarGeometry_trans } from "@modules_shared/utils/queryDataTransforms";

// XTGeo zcornsv[..., quadrant] ordering -- must match the backend's grid3d_pillar_geometry.py exactly.
const SW = 0;
const SE = 1;
const NW = 2;
const NE = 3;

// A cell's own corner at pillar offset (di, dj) is read from the DIAGONALLY OPPOSITE
// quadrant of that pillar -- verified by round-trip reconstruction against
// xtgeo.Grid.get_xyz_cell_corners() on a synthetic faulted grid (see the backend's
// grid3d_pillar_geometry.py for the same table and the test it was checked against).
const OWN_CORNER_TO_PILLAR_OFFSET_AND_QUADRANT: readonly [di: number, dj: number, quadrant: number][] = [
    [0, 0, NE], // own SW corner
    [1, 0, NW], // own SE corner
    [0, 1, SE], // own NW corner
    [1, 1, SW], // own NE corner
];

/**
 * One hexahedron (8 corners x xyz) per cell, flat cell index j*nx+i.
 * Corner order matches xtgeo's get_xyz_cell_corners():
 *   0 SW-top, 1 SE-top, 2 NW-top, 3 NE-top, 4 SW-base, 5 SE-base, 6 NW-base, 7 NE-base
 */
export function reconstructCellCorners(
    pillarGeometry: GridPillarGeometry_trans,
    layerGeometry: GridLayerCornerGeometry_trans,
): Float32Array {
    const { i_count: nx, j_count: ny, origin_utm_x: originX, origin_utm_y: originY, pillarsFloat32Arr } = pillarGeometry;
    const { cornerTFloat32Arr, splitIndicesUint32Arr, splitCornerTFloat32Arr } = layerGeometry;

    const cellCorners = new Float32Array(nx * ny * 24);

    for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
            const cellOffset = (j * nx + i) * 24;

            for (let interface_ = 0; interface_ <= 1; interface_++) {
                for (let ownCorner = 0; ownCorner < 4; ownCorner++) {
                    const [di, dj, quadrant] = OWN_CORNER_TO_PILLAR_OFFSET_AND_QUADRANT[ownCorner];
                    const pillarI = i + di;
                    const pillarJ = j + dj;

                    const t = lookupCornerT(
                        nx,
                        cornerTFloat32Arr,
                        splitIndicesUint32Arr,
                        splitCornerTFloat32Arr,
                        pillarI,
                        pillarJ,
                        interface_,
                        quadrant,
                    );

                    const [x, y, z] = pillarPoint(pillarsFloat32Arr, nx, pillarI, pillarJ, t, originX, originY);

                    const cornerIndex = interface_ * 4 + ownCorner;
                    const outOffset = cellOffset + cornerIndex * 3;
                    cellCorners[outOffset] = x;
                    cellCorners[outOffset + 1] = y;
                    cellCorners[outOffset + 2] = z;
                }
            }
        }
    }

    return cellCorners;
}

function lookupCornerT(
    nx: number,
    cornerT: Float32Array,
    splitIndices: Uint32Array,
    splitCornerT: Float32Array,
    i: number,
    j: number,
    interface_: number,
    quadrant: number,
): number {
    const flat = (j * (nx + 1) + i) * 2 + interface_;

    const pos = binarySearch(splitIndices, flat);
    if (pos >= 0) {
        return splitCornerT[pos * 4 + quadrant];
    }
    return cornerT[flat];
}

// splitIndices is sorted ascending (built as a flatnonzero on the backend).
function binarySearch(sortedArr: Uint32Array, target: number): number {
    let lo = 0;
    let hi = sortedArr.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (sortedArr[mid] === target) {
            return mid;
        }
        if (sortedArr[mid] < target) {
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return -1;
}

function pillarPoint(
    pillars: Float32Array,
    nx: number,
    i: number,
    j: number,
    t: number,
    originX: number,
    originY: number,
): [number, number, number] {
    const idx = (j * (nx + 1) + i) * 6;
    const x0 = pillars[idx] + originX;
    const y0 = pillars[idx + 1] + originY;
    const z0 = pillars[idx + 2];
    const x1 = pillars[idx + 3] + originX;
    const y1 = pillars[idx + 4] + originY;
    const z1 = pillars[idx + 5];

    return [x0 + t * (x1 - x0), y0 + t * (y1 - y0), z0 + t * (z1 - z0)];
}
