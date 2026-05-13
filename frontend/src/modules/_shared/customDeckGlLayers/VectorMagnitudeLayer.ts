import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { BitmapLayer } from "@deck.gl/layers";

import type { VectorDatum } from "./ParticleStreamlineLayer";

// ── Public types ──────────────────────────────────────────────────────────────

/** Maps a normalized value 0–1 to an RGB triplet. */
export type ColorMappingFn = (t: number) => [number, number, number];

export type VectorMagnitudeLayerProps = CompositeLayerProps & {
    vectors: VectorDatum[];
    opacity?: number;
    /**
     * Maps a normalized magnitude (0 = min, 1 = max in the dataset) to an RGB color.
     * Defaults to a white → red ramp.
     */
    colorMappingFn?: ColorMappingFn;
    /** Pixel resolution of the interpolated bitmap per slice (default: 256). */
    textureSize?: number;
};

// ── Default color mapping ─────────────────────────────────────────────────────

export const DEFAULT_COLOR_MAPPING_FN: ColorMappingFn = (t) => [255, Math.round(255 * (1 - t)), Math.round(255 * (1 - t))];

// ── Internal types ────────────────────────────────────────────────────────────

type GridData = { xs: number[]; ys: number[]; magGrid: number[][]; maxMag: number };

// 3-D corner positions in BitmapLayer order: [bottomLeft, bottomRight, topRight, topLeft]
type Corners3D = [[number, number, number], [number, number, number], [number, number, number], [number, number, number]];
type Slice3D = { canvas: HTMLCanvasElement; bounds: Corners3D };

type LayerState =
    | { mode: "2d"; canvas: HTMLCanvasElement; bounds: [number, number, number, number] }
    | { mode: "3d"; slices: Slice3D[] };

// ── Helpers ───────────────────────────────────────────────────────────────────

function isData3D(vectors: VectorDatum[]): boolean {
    const z0 = vectors[0]?.origin[2] ?? 0;
    return vectors.some((v) => Math.abs(v.origin[2] - z0) > 1e-6);
}

// ── Bilinear interpolation on a regular 2D grid ───────────────────────────────

function buildGrid2D(vectors: VectorDatum[], dim0: 0 | 1 | 2, dim1: 0 | 1 | 2): GridData | null {
    const d0Set = new Set<number>();
    const d1Set = new Set<number>();
    for (const v of vectors) {
        d0Set.add(v.origin[dim0]);
        d1Set.add(v.origin[dim1]);
    }
    const xs = [...d0Set].sort((a, b) => a - b);
    const ys = [...d1Set].sort((a, b) => a - b);
    if (xs.length * ys.length !== vectors.length) return null;

    const magMap = new Map<string, number>();
    let maxMag = 0;
    for (const v of vectors) {
        const mag = Math.hypot(v.direction[0], v.direction[1], v.direction[2]);
        magMap.set(`${v.origin[dim0]},${v.origin[dim1]}`, mag);
        if (mag > maxMag) maxMag = mag;
    }

    const magGrid: number[][] = ys.map((y) => xs.map((x) => magMap.get(`${x},${y}`) ?? 0));
    return { xs, ys, magGrid, maxMag: maxMag || 1 };
}

function bisectLeft(arr: number[], val: number): number {
    let lo = 0, hi = arr.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (arr[mid] < val) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

function bilinearSample(grid: GridData, wd0: number, wd1: number): number {
    const { xs, ys, magGrid } = grid;
    const xi = Math.max(0, Math.min(xs.length - 2, bisectLeft(xs, wd0) - 1));
    const yi = Math.max(0, Math.min(ys.length - 2, bisectLeft(ys, wd1) - 1));
    const tx = Math.max(0, Math.min(1, (wd0 - xs[xi]) / (xs[xi + 1] - xs[xi])));
    const ty = Math.max(0, Math.min(1, (wd1 - ys[yi]) / (ys[yi + 1] - ys[yi])));
    return (
        (1 - tx) * (1 - ty) * magGrid[yi][xi] +
        tx * (1 - ty) * magGrid[yi][xi + 1] +
        (1 - tx) * ty * magGrid[yi + 1][xi] +
        tx * ty * magGrid[yi + 1][xi + 1]
    );
}

// ── Canvas builder ────────────────────────────────────────────────────────────

/**
 * Builds a size×size bitmap for the 2D cross-section of `vectors` in the
 * (dim0, dim1) plane, using bilinear interpolation when the data is a regular
 * grid (IDW power-2 fallback otherwise).
 *
 * Texture convention (matches BitmapLayer UV mapping):
 *   row 0    → maxDim1  (UV top)
 *   row N-1  → minDim1  (UV bottom)
 *   col 0    → minDim0  (UV left)
 *   col N-1  → maxDim0  (UV right)
 */
function buildCanvas(
    vectors: VectorDatum[],
    bounds: [number, number, number, number], // [minD0, minD1, maxD0, maxD1]
    size: number,
    colorMappingFn: ColorMappingFn,
    opacity: number,
    dim0: 0 | 1 | 2,
    dim1: 0 | 1 | 2,
): HTMLCanvasElement {
    const [minD0, minD1, maxD0, maxD1] = bounds;
    const data = new Uint8ClampedArray(size * size * 4);
    const grid = buildGrid2D(vectors, dim0, dim1);

    let mags: number[] | null = null;
    let maxMag = 1;
    if (!grid) {
        mags = vectors.map((v) => Math.hypot(v.direction[0], v.direction[1], v.direction[2]));
        maxMag = Math.max(...mags) || 1;
    }

    for (let row = 0; row < size; row++) {
        const wd1 = maxD1 - (row / (size - 1)) * (maxD1 - minD1);
        for (let col = 0; col < size; col++) {
            const wd0 = minD0 + (col / (size - 1)) * (maxD0 - minD0);
            let t: number;
            if (grid) {
                t = bilinearSample(grid, wd0, wd1) / grid.maxMag;
            } else {
                let wMag = 0, wSum = 0;
                for (let i = 0; i < vectors.length; i++) {
                    const da = wd0 - vectors[i].origin[dim0];
                    const db = wd1 - vectors[i].origin[dim1];
                    const d2 = da * da + db * db;
                    if (d2 < 1e-10) { wMag = mags![i]; wSum = 1; break; }
                    const w = 1 / d2;
                    wMag += w * mags![i];
                    wSum += w;
                }
                t = (wSum > 0 ? wMag / wSum : 0) / maxMag;
            }
            const [r, g, b] = colorMappingFn(t);
            const idx = (row * size + col) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = Math.round(opacity * 255);
        }
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    canvas.getContext("2d")!.putImageData(new ImageData(data, size, size), 0, 0);
    return canvas;
}

// ── Bounds helpers ────────────────────────────────────────────────────────────

function planeBounds(
    vectors: VectorDatum[],
    dim0: 0 | 1 | 2,
    dim1: 0 | 1 | 2,
): [number, number, number, number] {
    let min0 = Infinity, min1 = Infinity, max0 = -Infinity, max1 = -Infinity;
    for (const v of vectors) {
        if (v.origin[dim0] < min0) min0 = v.origin[dim0];
        if (v.origin[dim1] < min1) min1 = v.origin[dim1];
        if (v.origin[dim0] > max0) max0 = v.origin[dim0];
        if (v.origin[dim1] > max1) max1 = v.origin[dim1];
    }
    const area = Math.max((max0 - min0) * (max1 - min1), 1);
    const n = new Set(vectors.map((v) => `${v.origin[dim0]},${v.origin[dim1]}`)).size;
    const pad = Math.sqrt(area / n) * 0.55;
    return [min0 - pad, min1 - pad, max0 + pad, max1 + pad];
}

// ── 2D mode ───────────────────────────────────────────────────────────────────

function build2DSlice(
    vectors: VectorDatum[],
    size: number,
    fn: ColorMappingFn,
    opacity: number,
): { canvas: HTMLCanvasElement; bounds: [number, number, number, number] } {
    const bounds = planeBounds(vectors, 0, 1);
    return { canvas: buildCanvas(vectors, bounds, size, fn, opacity, 0, 1), bounds };
}

// ── 3D mode: three families of cross-section planes ───────────────────────────

/**
 * Builds one set of parallel slices for the given plane orientation.
 *
 * dim0/dim1 are the two axes WITHIN the plane; dimGroup is the axis perpendicular
 * to the plane (we group vectors by their value on this axis).
 *
 * BitmapLayer UV–to–corner mapping used here:
 *   UV(0,0) → bottomLeft → image(col=0, row=N-1) → world (minD0, minD1)
 *   UV(1,0) → bottomRight → image(col=N-1, row=N-1) → world (maxD0, minD1)
 *   UV(1,1) → topRight   → image(col=N-1, row=0)   → world (maxD0, maxD1)
 *   UV(0,1) → topLeft    → image(col=0, row=0)     → world (minD0, maxD1)
 */
function buildAxisSlices(
    vectors: VectorDatum[],
    dim0: 0 | 1 | 2,
    dim1: 0 | 1 | 2,
    dimGroup: 0 | 1 | 2,
    size: number,
    fn: ColorMappingFn,
    opacity: number,
): Slice3D[] {
    const groupMap = new Map<number, VectorDatum[]>();
    for (const v of vectors) {
        const key = v.origin[dimGroup];
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(v);
    }

    // All groups share the same dim0/dim1 extent — compute once from the first group
    const firstGroup = groupMap.values().next().value!;
    const bounds = planeBounds(firstGroup, dim0, dim1);
    const [bMin0, bMin1, bMax0, bMax1] = bounds;

    const slices: Slice3D[] = [];
    for (const [gVal, group] of groupMap) {
        const canvas = buildCanvas(group, bounds, size, fn, opacity, dim0, dim1);

        // Assemble 3-D corners: place dim0/dim1 values in their axis slots
        const corner = (d0: number, d1: number): [number, number, number] => {
            const p: [number, number, number] = [0, 0, 0];
            p[dim0] = d0;
            p[dim1] = d1;
            p[dimGroup] = gVal;
            return p;
        };

        slices.push({
            canvas,
            bounds: [corner(bMin0, bMin1), corner(bMax0, bMin1), corner(bMax0, bMax1), corner(bMin0, bMax1)],
        });
    }
    return slices;
}

function build3DSlices(
    vectors: VectorDatum[],
    size: number,
    fn: ColorMappingFn,
    opacity: number,
): Slice3D[] {
    // Per-plane opacity is scaled so looking straight through all N planes of one
    // axis family gives roughly the user-requested opacity.
    const nPerAxis = Math.max(
        new Set(vectors.map((v) => v.origin[0])).size,
        new Set(vectors.map((v) => v.origin[1])).size,
        new Set(vectors.map((v) => v.origin[2])).size,
    );
    const perPlane = opacity / nPerAxis;

    return [
        ...buildAxisSlices(vectors, 0, 1, 2, size, fn, perPlane), // XY planes
        ...buildAxisSlices(vectors, 0, 2, 1, size, fn, perPlane), // XZ planes
        ...buildAxisSlices(vectors, 1, 2, 0, size, fn, perPlane), // YZ planes
    ];
}

// ── Layer ─────────────────────────────────────────────────────────────────────

export class VectorMagnitudeLayer extends CompositeLayer<VectorMagnitudeLayerProps> {
    static layerName = "VectorMagnitudeLayer";

    static defaultProps = {
        vectors: { type: "array" as const, value: [] as VectorDatum[], compare: false },
        opacity: { type: "number" as const, value: 0.6 },
        // Reference equality detects when the user passes a new function
        colorMappingFn: { type: "function" as const, value: DEFAULT_COLOR_MAPPING_FN },
        textureSize: { type: "number" as const, value: 256 },
    };

    // @ts-expect-error - deck.gl state typing convention
    state!: { layerState: LayerState | null; renderVersion: number };

    initializeState(): void {
        this.setState({ layerState: this._build(), renderVersion: 0 });
    }

    updateState({
        props,
        oldProps,
    }: UpdateParameters<Layer<VectorMagnitudeLayerProps & Required<CompositeLayerProps>>>): void {
        if (
            props.vectors !== oldProps.vectors ||
            props.opacity !== oldProps.opacity ||
            props.colorMappingFn !== oldProps.colorMappingFn ||
            props.textureSize !== oldProps.textureSize
        ) {
            this.setState({
                layerState: this._build(),
                renderVersion: (this.state.renderVersion ?? 0) + 1,
            });
        }
    }

    private _build(): LayerState | null {
        const { vectors, opacity, colorMappingFn, textureSize } = this.props;
        if (!vectors?.length) return null;

        const fn = colorMappingFn ?? DEFAULT_COLOR_MAPPING_FN;
        const alpha = opacity ?? 0.6;
        const size = textureSize ?? 256;

        if (isData3D(vectors)) {
            return { mode: "3d", slices: build3DSlices(vectors, size, fn, alpha) };
        }

        const { canvas, bounds } = build2DSlice(vectors, size, fn, alpha);
        return { mode: "2d", canvas, bounds };
    }

    renderLayers(): Layer[] {
        const { layerState, renderVersion } = this.state;
        if (!layerState) return [];

        // Embedding renderVersion in the sub-layer ID forces deck.gl to recreate
        // the BitmapLayer (and re-upload its WebGL texture) after every rebuild.
        if (layerState.mode === "2d") {
            return [
                new BitmapLayer(
                    this.getSubLayerProps({
                        id: `bitmap-v${renderVersion}`,
                        image: layerState.canvas,
                        bounds: layerState.bounds,
                        parameters: { depthTest: false },
                    }),
                ),
            ];
        }

        return layerState.slices.map((slice, i) =>
            new BitmapLayer(
                this.getSubLayerProps({
                    id: `slice-v${renderVersion}-${i}`,
                    image: slice.canvas,
                    bounds: slice.bounds as unknown as [number, number, number, number],
                    parameters: { depthTest: false },
                }),
            ),
        );
    }
}
