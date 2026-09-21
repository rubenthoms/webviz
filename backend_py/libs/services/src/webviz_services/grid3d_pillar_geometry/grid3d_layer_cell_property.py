"""
Per-cell grid property values for one K layer, in the same flat j*nx+i layout as
extract_layer_corner_geometry's `active` array -- direct from an xtgeo.GridProperty,
no poly/skin-mesh indirection involved.
"""

import numpy as np
import xtgeo
from numpy.typing import NDArray


def extract_layer_cell_property(grid_property: xtgeo.GridProperty, k: int) -> NDArray[np.float32]:
    values = np.ma.filled(grid_property.values, fill_value=0.0)

    nx, ny, nz = values.shape
    if not 0 <= k < nz:
        raise IndexError(f"K layer {k} is outside grid property with {nz} layers")

    layer_values = values[:, :, k]
    layer_values = np.ascontiguousarray(layer_values.T, dtype=np.float32)

    return layer_values.reshape(-1)
