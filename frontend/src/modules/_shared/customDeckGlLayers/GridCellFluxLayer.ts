import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { LineLayer, ScatterplotLayer, SolidPolygonLayer, TextLayer } from "@deck.gl/layers";
import type { ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/layers/utils/layerTools";

import type { BBox } from "@lib/utils/bbox";
import type { GridCellFluxData, GridCellFluxPhaseFlux } from "@modules/_shared/DataProviderFramework/visualization/utils/types";

type Phase = "oil" | "gas" | "water";
type Direction = "i" | "j" | "k";
type Vec3 = [number, number, number];

const PHASE_COLORS: Record<Phase, [number, number, number]> = {
    oil: [230, 60, 60],
    gas: [60, 200, 90],
    water: [60, 120, 230],
};

export type FluxPhasesShownProp = Record<Phase, boolean>;
export type FluxDirectionsShownProp = Record<Direction, boolean>;

export type GridCellFluxLayerProps = CompositeLayerProps & {
    data: GridCellFluxData | null;
    showPillars?: boolean;
    showWireframe?: boolean;
    showCellIndices?: boolean;
    showCellCornerPoints?: boolean;
    showPillarPoints?: boolean;
    phasesShown?: FluxPhasesShownProp;
    directionsShown?: FluxDirectionsShownProp;
    // World-unit arrow length for the smallest/largest non-zero flux magnitude in each
    // phase; everything in between is scaled linearly relative to that phase's own min/max,
    // not to an absolute flux value (which is case-dependent). Left undefined to fall back
    // to a size derived from the grid's own cell dimensions (see estimateDefaultArrowLengthRange).
    minArrowLength?: number;
    maxArrowLength?: number;

    // Non-public property: injected by subsurface-viewer's Map component (see Map.js's
    // layer.clone({reportBoundingBox: dispatchBoundingBox})) so this layer can report its
    // own extent for 3D-mode camera homing, same pattern as WellborePicksLayer/WellsLayer.
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
};

// Corner order: 0 SW-top, 1 SE-top, 2 NW-top, 3 NE-top, 4 SW-base, 5 SE-base, 6 NW-base, 7 NE-base
// (matches reconstructCellCorners / xtgeo.get_xyz_cell_corners).
const HEX_WIREFRAME_EDGES: readonly [number, number][] = [
    [0, 1],
    [1, 3],
    [3, 2],
    [2, 0], // top ring
    [4, 5],
    [5, 7],
    [7, 6],
    [6, 4], // base ring
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // verticals
];

const I_PLUS_FACE_CORNERS: readonly number[] = [1, 3, 5, 7];
const J_PLUS_FACE_CORNERS: readonly number[] = [2, 3, 6, 7];
const K_PLUS_FACE_CORNERS: readonly number[] = [4, 5, 6, 7]; // base ring -- "K+" = into the layer below

type LineDatum = { source: Vec3; target: Vec3 };
type ArrowDatum = { polygon: Vec3[]; color: [number, number, number] };
type LabelDatum = { position: Vec3; text: string };

// Grid Z is depth (increasing downward, TVD-style); negate for a Z-up world, same
// convention makeGridCellFluxBoundingBox uses and that Grid3DLayer applies internally
// via its own ZIncreasingDownwards flag -- LineLayer/SolidPolygonLayer/TextLayer have
// no equivalent, so it has to happen here instead.
function getCellCorner(cellCornersFloat32Arr: Float32Array, cellIndex: number, corner: number): Vec3 {
    const offset = cellIndex * 24 + corner * 3;
    return [cellCornersFloat32Arr[offset], cellCornersFloat32Arr[offset + 1], -cellCornersFloat32Arr[offset + 2]];
}

function averageCorners(cellCornersFloat32Arr: Float32Array, cellIndex: number, corners: readonly number[]): Vec3 {
    let x = 0;
    let y = 0;
    let z = 0;
    for (const corner of corners) {
        const p = getCellCorner(cellCornersFloat32Arr, cellIndex, corner);
        x += p[0];
        y += p[1];
        z += p[2];
    }
    return [x / corners.length, y / corners.length, z / corners.length];
}

function buildPillarLines(data: GridCellFluxData): LineDatum[] {
    const { nx, ny, pillarsFloat32Arr, originUtmX, originUtmY } = data;
    const lines: LineDatum[] = [];

    for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
            const idx = (j * (nx + 1) + i) * 6;
            lines.push({
                source: [pillarsFloat32Arr[idx] + originUtmX, pillarsFloat32Arr[idx + 1] + originUtmY, -pillarsFloat32Arr[idx + 2]],
                target: [
                    pillarsFloat32Arr[idx + 3] + originUtmX,
                    pillarsFloat32Arr[idx + 4] + originUtmY,
                    -pillarsFloat32Arr[idx + 5],
                ],
            });
        }
    }

    return lines;
}

function buildWireframeEdges(data: GridCellFluxData): LineDatum[] {
    const { nx, ny, cellCornersFloat32Arr, activeUint8Arr } = data;
    const lines: LineDatum[] = [];

    for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
        if (!activeUint8Arr[cellIndex]) {
            continue;
        }
        for (const [a, b] of HEX_WIREFRAME_EDGES) {
            lines.push({
                source: getCellCorner(cellCornersFloat32Arr, cellIndex, a),
                target: getCellCorner(cellCornersFloat32Arr, cellIndex, b),
            });
        }
    }

    return lines;
}

// A proper arrow outline: a narrow shaft leading into a wider triangular head,
// base at basePosition, tip extended along direction by length.
function makeArrowPolygon(basePosition: Vec3, direction: Vec3, length: number): Vec3[] {
    const [dx, dy, dz] = direction;
    const dirLen = Math.hypot(dx, dy, dz) || 1;
    const ndx = dx / dirLen;
    const ndy = dy / dirLen;
    const ndz = dz / dirLen;

    // Perpendicular via cross product with a stable reference axis.
    const ref: Vec3 = Math.abs(ndz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let rx = ndy * ref[2] - ndz * ref[1];
    let ry = ndz * ref[0] - ndx * ref[2];
    let rz = ndx * ref[1] - ndy * ref[0];
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    const [px, py, pz] = basePosition;
    const along = (s: number): Vec3 => [px + ndx * s, py + ndy * s, pz + ndz * s];
    const point = (s: number, w: number): Vec3 => {
        const [ax, ay, az] = along(s);
        return [ax + rx * w, ay + ry * w, az + rz * w];
    };

    const headLength = length * 0.4;
    const shaftLength = length - headLength;
    const shaftHalfWidth = length * 0.08;
    const headHalfWidth = length * 0.22;

    return [
        point(0, -shaftHalfWidth),
        point(shaftLength, -shaftHalfWidth),
        point(shaftLength, -headHalfWidth),
        along(length),
        point(shaftLength, headHalfWidth),
        point(shaftLength, shaftHalfWidth),
        point(0, shaftHalfWidth),
    ];
}

type ArrowCandidate = {
    faceCenter: Vec3;
    direction: Vec3;
    absFlux: number;
};

function buildFluxArrowsForPhase(
    data: GridCellFluxData,
    phase: Phase,
    phaseFlux: GridCellFluxPhaseFlux,
    directionsShown: FluxDirectionsShownProp,
    minArrowLength: number,
    maxArrowLength: number,
): ArrowDatum[] {
    const { nx, ny, cellCornersFloat32Arr, activeUint8Arr } = data;
    const color = PHASE_COLORS[phase];

    const allFaceSpecs: { direction: Direction; plusFaceCorners: readonly number[]; values: Float32Array }[] = [
        { direction: "i", plusFaceCorners: I_PLUS_FACE_CORNERS, values: phaseFlux.iFaceFlux },
        { direction: "j", plusFaceCorners: J_PLUS_FACE_CORNERS, values: phaseFlux.jFaceFlux },
        { direction: "k", plusFaceCorners: K_PLUS_FACE_CORNERS, values: phaseFlux.kFaceFlux },
    ];
    const faceSpecs = allFaceSpecs.filter((spec) => directionsShown[spec.direction]);

    // Pass 1: gather every non-zero flux face and its magnitude, so the smallest and
    // largest flux in this phase can be mapped to minArrowLength/maxArrowLength -- the
    // whole point is that arrow size is relative to this phase's own data range, not an
    // absolute per-arrow cap.
    const candidates: ArrowCandidate[] = [];
    let minAbsFlux = Infinity;
    let maxAbsFlux = -Infinity;

    for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
        if (!activeUint8Arr[cellIndex]) {
            continue;
        }

        const cellCenter = averageCorners(cellCornersFloat32Arr, cellIndex, [0, 1, 2, 3, 4, 5, 6, 7]);

        for (const { plusFaceCorners, values } of faceSpecs) {
            const flux = values[cellIndex];
            if (!flux) {
                continue;
            }

            const faceCenter = averageCorners(cellCornersFloat32Arr, cellIndex, plusFaceCorners);
            const outwardDir: Vec3 = [
                faceCenter[0] - cellCenter[0],
                faceCenter[1] - cellCenter[1],
                faceCenter[2] - cellCenter[2],
            ];
            const outwardDist = Math.hypot(outwardDir[0], outwardDir[1], outwardDir[2]);
            if (outwardDist < 1e-9) {
                continue;
            }

            // Positive flux -> arrow points outward (in the +direction the face is named for);
            // negative -> flow is actually going the other way, flip the arrow.
            const sign = Math.sign(flux);
            const direction: Vec3 = [
                (outwardDir[0] / outwardDist) * sign,
                (outwardDir[1] / outwardDist) * sign,
                (outwardDir[2] / outwardDist) * sign,
            ];

            const absFlux = Math.abs(flux);
            candidates.push({ faceCenter, direction, absFlux });
            if (absFlux < minAbsFlux) minAbsFlux = absFlux;
            if (absFlux > maxAbsFlux) maxAbsFlux = absFlux;
        }
    }

    // Pass 2: map each candidate's magnitude into [minArrowLength, maxArrowLength].
    const arrows: ArrowDatum[] = [];
    const fluxRange = maxAbsFlux - minAbsFlux;

    for (const { faceCenter, direction, absFlux } of candidates) {
        const t = fluxRange > 1e-12 ? (absFlux - minAbsFlux) / fluxRange : 1;
        const length = minArrowLength + t * (maxArrowLength - minArrowLength);

        arrows.push({ polygon: makeArrowPolygon(faceCenter, direction, length), color });
    }

    return arrows;
}

type PointDatum = { position: Vec3; color: [number, number, number, number] };

// Colored by corner role (top vs base) -- a cheap way to visually confirm
// orientation/top-bottom is what's expected, independent of the wireframe edges.
function buildCellCornerPoints(data: GridCellFluxData): PointDatum[] {
    const { nx, ny, cellCornersFloat32Arr, activeUint8Arr } = data;
    const points: PointDatum[] = [];

    for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
        if (!activeUint8Arr[cellIndex]) {
            continue;
        }
        for (let corner = 0; corner < 8; corner++) {
            const isTop = corner < 4;
            points.push({
                position: getCellCorner(cellCornersFloat32Arr, cellIndex, corner),
                color: isTop ? [255, 165, 0, 220] : [128, 0, 200, 220],
            });
        }
    }

    return points;
}

// Colored by endpoint (0 vs 1) -- same idea, for the raw pillar data straight off the wire.
function buildPillarPoints(data: GridCellFluxData): PointDatum[] {
    const { nx, ny, pillarsFloat32Arr, originUtmX, originUtmY } = data;
    const points: PointDatum[] = [];

    for (let j = 0; j <= ny; j++) {
        for (let i = 0; i <= nx; i++) {
            const idx = (j * (nx + 1) + i) * 6;
            points.push({
                position: [pillarsFloat32Arr[idx] + originUtmX, pillarsFloat32Arr[idx + 1] + originUtmY, -pillarsFloat32Arr[idx + 2]],
                color: [0, 180, 255, 220],
            });
            points.push({
                position: [pillarsFloat32Arr[idx + 3] + originUtmX, pillarsFloat32Arr[idx + 4] + originUtmY, -pillarsFloat32Arr[idx + 5]],
                color: [255, 0, 120, 220],
            });
        }
    }

    return points;
}

// Sample a handful of active cells' own I+ face distance as a stand-in for "typical cell
// size" in this grid, and derive a sensible default arrow-length range from it -- avoids
// needing a hardcoded world-unit constant that would be wrong for a case with a very
// different cell size.
function estimateDefaultArrowLengthRange(data: GridCellFluxData): [number, number] {
    const { nx, ny, cellCornersFloat32Arr, activeUint8Arr } = data;
    const maxSamples = 20;
    let sampleCount = 0;
    let distSum = 0;

    for (let cellIndex = 0; cellIndex < nx * ny && sampleCount < maxSamples; cellIndex++) {
        if (!activeUint8Arr[cellIndex]) {
            continue;
        }
        const cellCenter = averageCorners(cellCornersFloat32Arr, cellIndex, [0, 1, 2, 3, 4, 5, 6, 7]);
        const faceCenter = averageCorners(cellCornersFloat32Arr, cellIndex, I_PLUS_FACE_CORNERS);
        const dist = Math.hypot(faceCenter[0] - cellCenter[0], faceCenter[1] - cellCenter[1], faceCenter[2] - cellCenter[2]);
        if (dist > 1e-9) {
            distSum += dist;
            sampleCount++;
        }
    }

    const typicalCellHalfWidth = sampleCount > 0 ? distSum / sampleCount : 1;
    return [typicalCellHalfWidth * 0.2, typicalCellHalfWidth * 0.9];
}

function buildCellLabels(data: GridCellFluxData): LabelDatum[] {
    const { nx, ny, k, cellCornersFloat32Arr, activeUint8Arr } = data;
    const labels: LabelDatum[] = [];
    // Global flat index (i + j*nx + k*nx*ny), matching the convention
    // poly_source_cell_indices uses -- not our local, layer-relative j*nx+i -- so labels
    // can be cross-referenced directly against other tooling that reports global indices.
    const kOffset = k * nx * ny;

    for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
        if (!activeUint8Arr[cellIndex]) {
            continue;
        }
        const center = averageCorners(cellCornersFloat32Arr, cellIndex, [0, 1, 2, 3, 4, 5, 6, 7]);
        labels.push({ position: center, text: String(cellIndex + kOffset) });
    }

    return labels;
}

// The single source of truth for this layer's world-space extent, computed from the same
// arrays renderLayers() draws from -- kept here (rather than re-derived from raw fetched
// data elsewhere) so it can't drift out of sync with what's actually rendered.
export function computeGridCellFluxBoundingBox(data: GridCellFluxData): BBox | null {
    const { cellCornersFloat32Arr, pillarsFloat32Arr, originUtmX, originUtmY } = data;
    if (cellCornersFloat32Arr.length === 0 && pillarsFloat32Arr.length === 0) {
        return null;
    }

    let xmin = Infinity;
    let ymin = Infinity;
    let zmin = Infinity;
    let xmax = -Infinity;
    let ymax = -Infinity;
    let zmax = -Infinity;

    function extend(x: number, y: number, z: number): void {
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
        if (z < zmin) zmin = z;
        if (z > zmax) zmax = z;
    }

    // Already absolute UTM coordinates (reconstructCellCorners bakes the pillar origin in),
    // covers only this k-layer.
    for (let i = 0; i < cellCornersFloat32Arr.length; i += 3) {
        extend(cellCornersFloat32Arr[i], cellCornersFloat32Arr[i + 1], cellCornersFloat32Arr[i + 2]);
    }

    // Origin-relative, and fetched without a k filter -- pillars span the grid's full
    // vertical extent, taller than the single k-layer of cell corners above. showPillars/
    // showPillarPoints render this full extent, so it has to be included here too, or the
    // reported box is too tight and any camera fit to it makes the actually-rendered
    // geometry look oversized.
    for (let i = 0; i < pillarsFloat32Arr.length; i += 6) {
        extend(pillarsFloat32Arr[i] + originUtmX, pillarsFloat32Arr[i + 1] + originUtmY, pillarsFloat32Arr[i + 2]);
        extend(pillarsFloat32Arr[i + 3] + originUtmX, pillarsFloat32Arr[i + 4] + originUtmY, pillarsFloat32Arr[i + 5]);
    }

    // Z convention here is depth (increasing downward, TVD-style); negate for a Z-up
    // bounding box, same convention as getCellCorner/buildPillarLines above.
    return {
        min: { x: xmin, y: ymin, z: -zmax },
        max: { x: xmax, y: ymax, z: -zmin },
    };
}

export class GridCellFluxLayer extends CompositeLayer<GridCellFluxLayerProps> {
    static layerName = "GridCellFluxLayer";

    // Mirrors the reportBoundingBox/computeBoundingBox getter pattern used by
    // @webviz/subsurface-viewer's own layers (e.g. PointsLayer, Grid3DLayer): the layer
    // that builds the geometry is also the one that knows its true extent.
    static getBoundingBox(data: GridCellFluxData | null): BBox | null {
        if (!data) {
            return null;
        }
        return computeGridCellFluxBoundingBox(data);
    }

    static defaultProps = {
        showPillars: { type: "boolean" as const, value: true },
        showWireframe: { type: "boolean" as const, value: true },
        showCellIndices: { type: "boolean" as const, value: false },
        showCellCornerPoints: { type: "boolean" as const, value: false },
        showPillarPoints: { type: "boolean" as const, value: false },
        phasesShown: {
            type: "object" as const,
            value: { oil: true, gas: true, water: true } as FluxPhasesShownProp,
        },
        directionsShown: {
            type: "object" as const,
            value: { i: true, j: true, k: true } as FluxDirectionsShownProp,
        },
        // minArrowLength/maxArrowLength deliberately have no default here -- undefined
        // means "derive from the grid's own cell size" (see estimateDefaultArrowLengthRange).
    };

    updateState({
        props,
        changeFlags,
    }: UpdateParameters<Layer<GridCellFluxLayerProps & Required<CompositeLayerProps>>>): void {
        if (props.reportBoundingBox && changeFlags.dataChanged && props.data) {
            const bbox = computeGridCellFluxBoundingBox(props.data);
            if (bbox) {
                props.reportBoundingBox({
                    layerBoundingBox: [bbox.min.x, bbox.min.y, bbox.min.z, bbox.max.x, bbox.max.y, bbox.max.z],
                });
            }
        }
    }

    renderLayers(): Layer[] {
        const {
            data,
            showPillars,
            showWireframe,
            showCellIndices,
            showCellCornerPoints,
            showPillarPoints,
            phasesShown,
            directionsShown,
            minArrowLength,
            maxArrowLength,
        } = this.props;
        if (!data) {
            return [];
        }

        const layers: Layer[] = [];

        if (showPillars) {
            layers.push(
                new LineLayer(
                    this.getSubLayerProps({
                        id: "pillars",
                        data: buildPillarLines(data),
                        getSourcePosition: (d: LineDatum) => d.source,
                        getTargetPosition: (d: LineDatum) => d.target,
                        getColor: [120, 120, 120, 140],
                        widthMinPixels: 1,
                    }),
                ),
            );
        }

        if (showPillarPoints) {
            layers.push(
                new ScatterplotLayer(
                    this.getSubLayerProps({
                        id: "pillar-points",
                        data: buildPillarPoints(data),
                        getPosition: (d: PointDatum) => d.position,
                        getFillColor: (d: PointDatum) => d.color,
                        getRadius: 3,
                        radiusUnits: "pixels",
                    }),
                ),
            );
        }

        if (showCellCornerPoints) {
            layers.push(
                new ScatterplotLayer(
                    this.getSubLayerProps({
                        id: "cell-corner-points",
                        data: buildCellCornerPoints(data),
                        getPosition: (d: PointDatum) => d.position,
                        getFillColor: (d: PointDatum) => d.color,
                        getRadius: 3,
                        radiusUnits: "pixels",
                    }),
                ),
            );
        }

        if (showWireframe) {
            layers.push(
                new LineLayer(
                    this.getSubLayerProps({
                        id: "wireframe",
                        data: buildWireframeEdges(data),
                        getSourcePosition: (d: LineDatum) => d.source,
                        getTargetPosition: (d: LineDatum) => d.target,
                        getColor: [40, 40, 40, 200],
                        widthMinPixels: 1,
                    }),
                ),
            );
        }

        const activePhasesShown = phasesShown ?? { oil: true, gas: true, water: true };
        const activeDirectionsShown = directionsShown ?? { i: true, j: true, k: true };
        const [defaultMinLength, defaultMaxLength] = estimateDefaultArrowLengthRange(data);
        const effectiveMinLength = minArrowLength ?? defaultMinLength;
        const effectiveMaxLength = maxArrowLength ?? defaultMaxLength;
        const arrows: ArrowDatum[] = [];
        for (const phase of Object.keys(data.phaseFlux) as Phase[]) {
            if (!activePhasesShown[phase]) {
                continue;
            }
            const phaseFlux = data.phaseFlux[phase];
            if (phaseFlux) {
                arrows.push(
                    ...buildFluxArrowsForPhase(
                        data,
                        phase,
                        phaseFlux,
                        activeDirectionsShown,
                        effectiveMinLength,
                        effectiveMaxLength,
                    ),
                );
            }
        }
        if (arrows.length > 0) {
            layers.push(
                new SolidPolygonLayer(
                    this.getSubLayerProps({
                        id: "flux-arrows",
                        data: arrows,
                        getPolygon: (d: ArrowDatum) => d.polygon,
                        getFillColor: (d: ArrowDatum) => d.color,
                        filled: true,
                        stroked: false,
                        pickable: false,
                    }),
                ),
            );
        }

        if (showCellIndices) {
            layers.push(
                new TextLayer(
                    this.getSubLayerProps({
                        id: "cell-indices",
                        data: buildCellLabels(data),
                        getPosition: (d: LabelDatum) => d.position,
                        getText: (d: LabelDatum) => d.text,
                        getSize: 12,
                        getColor: [0, 0, 0, 255],
                        getAlignmentBaseline: "center" as const,
                    }),
                ),
            );
        }

        return layers;
    }
}
