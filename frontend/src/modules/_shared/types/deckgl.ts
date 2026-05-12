import type { ViewportType, ViewsType } from "@webviz/subsurface-viewer";

import type { ColorScaleWithId } from "../components/ColorLegendsContainer/colorScaleWithId";

export interface ViewportTypeExtended extends ViewportType {
    color: string | null;
    colorScales: ColorScaleWithId[];
}

export interface ViewsTypeExtended extends ViewsType {
    viewports: ViewportTypeExtended[];
}

/**
 * Custom props for snappy layer behaviour.
 *
 * When `isSnappy` is true the layer is prioritised during hover/pick resolution:
 * the viewer performs an extra radial pick within `snapRadius` pixels and surfaces
 * the closest matching object instead of whatever happens to be under the cursor.
 */
export interface SnappyLayerProps {
    isSnappy?: boolean;
    snapRadius?: number;
}
