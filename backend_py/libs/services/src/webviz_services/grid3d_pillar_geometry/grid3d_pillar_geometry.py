"""
Corner-point grid geometry extraction, in a compact pillar-sharing form.

This is deliberately kept as an internal, plain-dataclass result type, separate
from whatever wire schema a router maps it onto. Both the xtgeo access pattern
used here and the eventual wire format are considered provisional for now -- a
router owns translating GridPillarGeometry/LayerCornerGeometry onto its own
response model, and a frontend consumer should do the equivalent on its side,
so either can change without touching the actual geometry math or, downstream,
the trace/rendering code.

Only split types 1 (shared) and 4 (SW/SE/NW/NE quadrant split) are supported.
This matches xtgeo's own zcornsv format, which cannot represent anything else
in the first place -- xtgeo.grid_from_file() itself fails outright on split
types 2 or 8 (verified against xtgeo 4.11.0/4.26.0), so any grid this backend
can load via the normal xtgeo path is already guaranteed to fit this model.
"""

from dataclasses import dataclass

import numpy as np
import xtgeo
from numpy.typing import NDArray

# XTGeo zcornsv[..., quadrant] ordering.
SW = 0
SE = 1
NW = 2
NE = 3


@dataclass(frozen=True)
class GridPillarGeometry:
    """
    Geometry shared by all K layers.

    origin_utm_x, origin_utm_y:
        UTM coordinates of pillar (i=0, j=0). All X/Y values in `pillars` are
        relative to this point (float32 precision on raw UTM-scale coordinates
        loses sub-meter accuracy; Z is left absolute since its magnitude does
        not have the same problem).

    pillars:
        Flat float32 array with layout:

            [j][i][endpoint_xyz]

        where endpoint_xyz is:

            dx0, dy0, z0, dx1, dy1, z1

        with dx/dy relative to (origin_utm_x, origin_utm_y). Pillar (i, j)
        starts at:

            (j * (nx + 1) + i) * 6
    """

    nx: int
    ny: int
    nz: int
    origin_utm_x: float
    origin_utm_y: float
    pillars: NDArray[np.float32]


@dataclass(frozen=True)
class LayerCornerGeometry:
    """
    Geometry specific to one K layer.

    corner_t:
        One common t value per pillar/interface:

            [j][i][interface]

        interface:
            0 = top
            1 = base

        Flat index:

            ((j * (nx + 1) + i) * 2 + interface)

    split_indices:
        Indices into corner_t for pillar/interfaces where the four XTGeo
        quadrant values are not identical.

    split_corner_t:
        Four values per split entry, in XTGeo's native pillar-quadrant order:

            [SW, SE, NW, NE]

        split_corner_t[n * 4 + quadrant] corresponds to
        corner_t[split_indices[n]].

        IMPORTANT: a pillar's quadrant value belongs to the cell diagonally
        opposite it -- e.g. cell (a, b)'s own SW corner is read from pillar
        (a, b)'s NE quadrant, not its SW quadrant. Verified by round-trip
        reconstruction against xtgeo.Grid.get_xyz_cell_corners() on a
        synthetic faulted grid.

    active:
        One byte per cell:

            active[j * nx + i]
    """

    k: int
    corner_t: NDArray[np.float32]
    split_indices: NDArray[np.uint32]
    split_corner_t: NDArray[np.float32]
    active: NDArray[np.uint8]


def _get_coord_and_zcorn_arrays(grid: xtgeo.Grid) -> tuple[NDArray[np.float64], NDArray[np.float32]]:
    """
    Returns (coord, zcorn) with XTGeo's own internal layout:

        coord: float64, shape (nx+1, ny+1, 6) -- [x0, y0, z0, x1, y1, z1] per pillar
        zcorn: float32, shape (nx+1, ny+1, nz+1, 4) -- SW/SE/NW/NE quadrant z-value
               per pillar/interface

    ISOLATION BOUNDARY: this is the only place in this module that touches
    xtgeo's private _coordsv/_zcornsv -- xtgeo does not currently expose this
    data through public API (only as private attributes, verified stable in
    shape/dtype across xtgeo 4.11.0-4.26.0; the Grid constructor itself takes
    coordsv/zcornsv as public kwargs of this exact shape, we're just missing a
    symmetric public getter -- tracked upstream at [xtgeo issue link, TODO]).
    Everything else in this module only depends on the shapes documented
    above, so swapping the source later (a future public xtgeo API, or
    parsing ROFF directly) only means reimplementing this one function.
    """
    grid._set_xtgformat2()  # pylint: disable=protected-access

    coord = np.asarray(grid._coordsv)  # pylint: disable=protected-access
    zcorn = np.asarray(grid._zcornsv)  # pylint: disable=protected-access

    nx, ny, nz = grid.dimensions
    if coord.shape != (nx + 1, ny + 1, 6):
        raise RuntimeError(f"Unexpected xtgeo coordsv shape {coord.shape}, expected {(nx + 1, ny + 1, 6)}")
    if zcorn.shape != (nx + 1, ny + 1, nz + 1, 4):
        raise RuntimeError(f"Unexpected xtgeo zcornsv shape {zcorn.shape}, expected {(nx + 1, ny + 1, nz + 1, 4)}")

    return coord, zcorn


def extract_grid_pillar_geometry(grid: xtgeo.Grid) -> GridPillarGeometry:
    nx, ny, nz = grid.dimensions
    coord, _ = _get_coord_and_zcorn_arrays(grid)

    origin_utm_x = float(coord[0, 0, 0])
    origin_utm_y = float(coord[0, 0, 1])

    pillars = coord.copy()
    pillars[..., 0] -= origin_utm_x
    pillars[..., 3] -= origin_utm_x
    pillars[..., 1] -= origin_utm_y
    pillars[..., 4] -= origin_utm_y

    pillars = pillars.transpose(1, 0, 2)
    pillars = np.ascontiguousarray(pillars, dtype=np.float32)
    pillars = pillars.reshape(-1)

    return GridPillarGeometry(
        nx=nx,
        ny=ny,
        nz=nz,
        origin_utm_x=origin_utm_x,
        origin_utm_y=origin_utm_y,
        pillars=pillars,
    )


def extract_layer_corner_geometry(
    grid: xtgeo.Grid,
    k: int,
    *,
    split_tolerance: float = 1e-6,
) -> LayerCornerGeometry:
    nx, ny, nz = grid.dimensions

    if not 0 <= k < nz:
        raise IndexError(f"K layer {k} is outside grid with {nz} layers")

    coord, zcorn = _get_coord_and_zcorn_arrays(grid)

    z0 = coord[:, :, 2]
    z1 = coord[:, :, 5]

    layer_z = zcorn[:, :, k : k + 2, :]

    dz = z1 - z0
    degenerate = np.isclose(dz, 0.0)
    if np.any(degenerate):
        count = int(np.count_nonzero(degenerate))
        raise ValueError(
            f"Grid contains {count} pillar(s) with identical endpoint Z. Cannot parameterize those pillars using Z."
        )

    t = (layer_z - z0[:, :, None, None]) / dz[:, :, None, None]

    is_split = ~np.all(
        np.isclose(t, t[..., :1], rtol=0.0, atol=split_tolerance),
        axis=-1,
    )

    common_t_transport = np.transpose(t[..., 0], (1, 0, 2))
    corner_t = np.ascontiguousarray(common_t_transport, dtype=np.float32).reshape(-1)

    split_mask_transport = np.transpose(is_split, (1, 0, 2)).reshape(-1)
    split_indices = np.flatnonzero(split_mask_transport).astype(np.uint32)

    all_corner_t = np.transpose(t, (1, 0, 2, 3))
    all_corner_t = np.ascontiguousarray(all_corner_t, dtype=np.float32).reshape(-1, 4)
    split_corner_t = (
        all_corner_t[split_indices]
        .reshape(-1)
        .astype(np.float32, copy=False)
    )

    active = np.asarray(grid.actnum_array[:, :, k])
    active = np.ascontiguousarray(active.T, dtype=np.uint8).reshape(-1)

    return LayerCornerGeometry(
        k=k,
        corner_t=corner_t,
        split_indices=split_indices,
        split_corner_t=split_corner_t,
        active=active,
    )
