import type {
    _ConstructorOf,
    CompositeLayerProps,
    Layer,
    LayerProps,
    LayersList,
    Position,
    UpdateParameters,
} from "@deck.gl/core";
import { CompositeLayer } from "@deck.gl/core";
import { GeoJsonLayer, ScatterplotLayer, SolidPolygonLayer } from "@deck.gl/layers";
import type { Feature, Polygon } from "geojson";
import { random, range } from "lodash-es";

import { cross, dot, fromArray, length, subtract, toArray, normalize, type Vec3, scale } from "@lib/utils/vec3";

import { PHASE_COLORS_RGB } from "../constants/colors";
import type { FluxPhasesShownSetting } from "../DataProviderFramework/settings/implementations/FluxPhasesShownSetting";
import type { GridCellFluxData, GridCellFluxPhaseFlux } from "../DataProviderFramework/visualization/utils/types";
import type { Direction, Phase } from "../types/grid";

export enum SubLayerId {
    CELL_CENTERS = "cellCenters",
    PARTICLES = "particles",

    WATER_VELOCITY = "waterVelocity",
    OIL_VELOCITY = "oilVelocity",
    GAS_VELOCITY = "gasVelocity",
}

export type GridPhaseFluxFlowLayerProps = CompositeLayerProps & {
    data: GridCellFluxData | null;
    // phasesShown: Partial<FluxPhasesShownSetting>;
    phase: Phase;
    numParticles: 1000;
};

const DIRECTION_TO_FLUX_KEY_MAP: Record<Direction, keyof GridCellFluxPhaseFlux> = {
    i: "iFaceFlux",
    j: "jFaceFlux",
    k: "kFaceFlux",
};

const I_PLUS_FACE_CORNERS: readonly number[] = [1, 3, 5, 7];
const I_MINUS_FACE_CORNERS: readonly number[] = [0, 2, 4, 6];

const J_PLUS_FACE_CORNERS: readonly number[] = [2, 3, 6, 7];
const J_MINUS_FACE_CORNERS: readonly number[] = [0, 1, 4, 5];

const K_PLUS_FACE_CORNERS: readonly number[] = [0, 1, 2, 3]; // base ring -- "K+" = into the layer below
const K_MINUS_FACE_CORNERS: readonly number[] = [4, 5, 6, 7]; // base ring -- "K-" = into the layer above

// Worry about 2d first

const DEBUG_DIRECTION_COLORS: Record<string, [number, number, number]> = {
    iPlus: [255, 0, 0],
    iMinus: [0, 255, 0],
    jPlus: [0, 0, 255],
    jMinus: [255, 255, 0],
    kPlus: [255, 0, 255],
    kMinus: [0, 255, 255],
} as const;

// TODO: Move to GPU
type CellData = {
    // Velocity at each outgoing edge. Used for Pollock interpolation
    velocityIMinus: Vec3;
    velocityIPlus: Vec3;
    velocityJMinus: Vec3;
    velocityJPlus: Vec3;

    // Neighboring cell indices, as the particle moves across an edge, it's cellIndex will change
    // Null implies edge of map, or a fault
    neighborIMinus: number | null;
    neighborIPlus: number | null;
    neighborJMinus: number | null;
    neighborJPlus: number | null;

    // Transform value to convert back to real life coordinates/speed
    // transform: number;
    // corners: number[][];

    corners: number[][];
};

type ParticleData = {
    cell: number | null;
    age: number;

    // Relative cell position
    u: number;
    v: number;
    w: number;
};

export class GridPhaseFluxFlowLayer extends CompositeLayer<GridPhaseFluxFlowLayerProps> {
    declare state: {
        // World pos
        cellCenters: Vec3[];
        // For 2D, z value is ignored
        // cellPhaseVelocities: Record<Phase, Vec3[]>;
        // cellPhaseVelocities: Record<Phase, Vec3>[];

        cellOilVelocities: Vec3[];
        cellGasVelocities: Vec3[];
        cellWaterVelocities: Vec3[];

        cellIndices: number[];

        // maxVelocity: number

        cellData: (CellData | null)[];
        particles: ParticleData[];

        // DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[];
        DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[];
        DEBUG_CENTERS: Vec3[];
    };

    updateState({
        props,
        changeFlags,
    }: UpdateParameters<Layer<GridPhaseFluxFlowLayerProps & Required<CompositeLayerProps>>>): void {
        if (!changeFlags.dataChanged) return;

        if (!props.data) {
            this.setState({
                cellVelocities: [],
                cellIndices: [],
            });
            return;
        }

        const { nx, ny, activeUint8Arr, cellCornersFloat32Arr, phaseFlux } = props.data;
        // const visiblePhase = phaseFlux[props.phase];

        // const centerPoints = computeCellCenters(props.data);

        const cellCenterPoints: Vec3[] = [];
        const particles: ParticleData[] = [];
        const cellData: (CellData | null)[] = [];
        // const phaseVelocities: Record<Phase, Vec3>[] = [];

        // const oilVelocities = [];
        // const gasVelocities = [];
        // const waterVelocities = [];

        // const particles = range()
        const DEBUG_POLYGONS: { polygon: number[][]; color: number[] }[] = [];
        const DEBUG_CENTERS: Vec3[] = [];

        for (let cellIndex = 0; cellIndex < nx * ny; cellIndex++) {
            // Inactive cells have been excluded from the simulation, and can be ignored
            if (!activeUint8Arr[cellIndex]) {
                cellData.push(null);
                continue;
            }

            const cellNeighborIndices = getCellNeighborIndices(cellIndex, nx, ny, props.data.k);
            // TODO: Check for faults / inactive neighbors
            //

            // const iFacePlus = getFace("i", cellIndex);
            // const jFacePlus = getFlux("j", cellIndex);
            // const iFaceMinus = getFlux("i", cellNeighborIndices.iMinus) * -1;
            // const jFaceMinus = getFlux("j", cellNeighborIndices.jMinus) * -1;

            const cellCenter = getCellCenter(cellCornersFloat32Arr, cellIndex);

            const faces = getCellFaces(cellCornersFloat32Arr, cellIndex);

            const faceCenters = {
                iPlus: getCenter(faces.iPlus),
                iMinus: getCenter(faces.iMinus),

                jPlus: getCenter(faces.jPlus),
                jMinus: getCenter(faces.jMinus),

                kMinus: getCenter(faces.kMinus),
                kPlus: getCenter(faces.kPlus),
            };

            // console.log("faces", faces);

            // const iFaceFluxPlus = getFlux(phaseFlux, props.phase, "i", cellIndex);
            // const jFaceFluxPlus = getFlux(phaseFlux, props.phase, "j", cellIndex);

            // ! Positive flows **in**, so we flip these
            // const iFaceFluxMinus = getFlux(phaseFlux, props.phase, "i", cellNeighborIndices.iMinus) * -1;
            // const jFaceFluxMinus = getFlux(phaseFlux, props.phase, "j", cellNeighborIndices.jMinus) * -1;

            const fluxes = {
                iPlus: getFlux(phaseFlux, props.phase, "i", cellIndex),
                iMinus: getFlux(phaseFlux, props.phase, "i", cellNeighborIndices.iMinus) * -1,

                jPlus: getFlux(phaseFlux, props.phase, "j", cellIndex),
                jMinus: getFlux(phaseFlux, props.phase, "j", cellNeighborIndices.jMinus) * -1,

                kPlus: 0,
                kMinus: 0,
            };

            const outwardDirection = {
                iPlus: getOutwardFromCenter(cellCenter, faceCenters.iPlus),
                iMinus: getOutwardFromCenter(cellCenter, faceCenters.iMinus),

                jPlus: getOutwardFromCenter(cellCenter, faceCenters.jPlus),
                jMinus: getOutwardFromCenter(cellCenter, faceCenters.jMinus),

                kPlus: { x: 0, y: 0, z: 1 } as Vec3,
                kMinus: { x: 0, y: 0, z: -1 } as Vec3,
            };

            const velocities = {
                iPlus: scale(outwardDirection.iPlus, fluxes.iPlus / computeFaceArea(faces.iPlus)),
                iMinus: scale(outwardDirection.iMinus, fluxes.iMinus / computeFaceArea(faces.iMinus)),
                jPlus: scale(outwardDirection.jPlus, fluxes.jPlus / computeFaceArea(faces.jPlus)),
                jMinus: scale(outwardDirection.jMinus, fluxes.jMinus / computeFaceArea(faces.jMinus)),

                kPlus: scale(outwardDirection.kPlus, fluxes.kPlus / computeFaceArea(faces.kPlus)),
                kMinus: scale(outwardDirection.kMinus, fluxes.kMinus / computeFaceArea(faces.kMinus)),
            };

            cellData.push({
                velocityIMinus: velocities.iMinus,
                velocityIPlus: velocities.iPlus,
                velocityJMinus: velocities.jMinus,
                velocityJPlus: velocities.jPlus,

                neighborIMinus: cellNeighborIndices.iMinus,
                neighborIPlus: cellNeighborIndices.iPlus,
                neighborJMinus: cellNeighborIndices.jMinus,
                neighborJPlus: cellNeighborIndices.jPlus,

                // geometry: {
                //     iMinus: faces.iMinus,
                //     iPlus: faces.iPlus,
                //     jMinus: faces.jMinus,
                //     jPlus: faces.jPlus,
                //     kMinus: faces.kMinus,
                //     kPlus: faces.kPlus,
                // },
                // corners: getCell
                corners: getCellCorners(cellCornersFloat32Arr, cellIndex),
            });

            // As a test, add a particle at a random point in the cell:
            // TODO: Spawn particles base on camera and so on
            range(0, 5).forEach(() => {
                particles.push({
                    cell: cellIndex,
                    age: 0,
                    u: Math.random(),
                    v: Math.random(),
                    // w: Math.random(),
                    w: 0.5,
                });
            });

            // cellCenterPoints.push(getCellCenter(cellCornersFloat32Arr, cellIndex));

            // console.log(cellIndex, "has", cellNeighborIndices, phaseFlux);

            // const phaseVelocities = {} as Partial<Record<Phase, Vec3>>;
            // Get cell velocities for each phase
            // TODO: Consider: individual layers per phase?
            // for (const phase of Object.keys(phaseFlux) as (keyof typeof phaseFlux)[]) {
            // if (!phaseFlux[phase]) continue;

            // Each cell has face data for 3 sides. This means we need to access flux data from 3 neighbors as well
            // Positive flows out
            // const iFaceFluxPlus = getFlux(phaseFlux, phase, "i", cellIndex);
            // const jFaceFluxPlus = getFlux(phaseFlux, phase, "j", cellIndex);

            // // ! Positive flows **in**, so we flip these
            // const iFaceFluxMinus = getFlux(phaseFlux, phase, "i", cellNeighborIndices.iMinus) * -1;
            // const jFaceFluxMinus = getFlux(phaseFlux, phase, "j", cellNeighborIndices.jMinus) * -1;

            // console.log(cellIndex, "has", iFaceFluxPlus, jFaceFluxPlus, iFaceFluxMinus, jFaceFluxMinus);

            // // ! We'll focus on 2D for now, and come back to the issue for 3D, as it'd need the K-layer
            // // const kFaceFlux   = fluxForPhase.kFaceFlux[cellIndex]
            // const kFaceFlux = 0;
            // const kFaceFluxNeg = 0;

            // // console.log(cellIndex, iFaceFlux, jFaceFlux, iFaceFluxNeg, jFaceFluxNeg);

            // // const exitVectors = [];

            // /*
            //         -j
            //      ________
            //     |        |
            //  -i |        | i
            //     |________|
            //         j
            // */

            // const flowExitDirection: Vec3 = { x: 0, y: 0, z: 0 };

            // if (iFaceFlux > 0) flowExitDirection.x = iFaceFlux;
            // if (jFaceFlux > 0) flowExitDirection.y = jFaceFlux;
            // if (iFaceFluxNeg < 0) flowExitDirection.x = -iFaceFluxNeg;
            // if (jFaceFluxNeg < 0) flowExitDirection.y = -jFaceFluxNeg;

            // // const cellVelocity = exitVectors.reduce(
            // //     (sum, vec) => ({
            // //         x: sum.x + vec.x,
            // //         y: sum.y + vec.y,
            // //         z: sum.z + vec.z,
            // //     }),
            // //     { x: 0, y: 0, z: 0 },
            // // );

            // //     if(iFaceFluxNeg > 0) exitVectors.push({x: -1, y: 0, z: 0})
            // // if(jFaceFluxNeg > 0) exitVectors.push({x: 0, y: -1, z: 0})

            // // console.log(iFaceFlux, iFaceFluxNeg);

            // // if (length(cellVelocity) > 0) {
            // //     console.log("waterWell", cellVelocity, cellIndex);
            // // }

            // // console.log(`Cell ${cellIndex} ${phase} velocity:`, cellVelocity);
            // // phaseVelocities[phase] = cellVelocity;
            // if (phase === "oil") oilVelocities.push(flowExitDirection);
            // if (phase === "gas") gasVelocities.push(flowExitDirection);
            // if (phase === "water") waterVelocities.push(flowExitDirection);
            // }

            // Debug
            if (true) {
                // if (cellIndex % 2 === 0) {
                // if (cellIndex % 3 === 0) {
                // DEBUG_CENTERS.push(fromArray(cellCenter));

                const velocityPolygons = Object.entries(velocities).map<{ polygon: number[][]; color: number[] }>(
                    ([face, velocity]) => ({
                        color: DEBUG_DIRECTION_COLORS[face],
                        polygon: makeArrowPolygon(
                            fromArray(faceCenters[face as keyof typeof faceCenters]),
                            velocity,
                            length(velocity) * 2,
                        ),
                    }),
                );

                // const directionPolygons = Object.entries(outwardDirection).map<{
                //     polygon: number[][];
                //     color: number[];
                // }>(([face, dir]) => ({
                //     color: DEBUG_DIRECTION_COLORS[face],
                //     polygon: makeArrowPolygon(fromArray(faceCenters[face as keyof typeof faceCenters]), dir, 20),
                // }));

                // outwardDirection;
                // const velocityPolygons2 = Object.entries(faces).map<{ polygon: number[][]; color: number[] }>(
                //     ([direction, faceCorners]) => ({
                //         color: DEBUG_DIRECTION_COLORS[direction],
                //         polygon: makeArrowPolygon(getCenter(faceCorners), scale(getFaceNormal(faceCorners), -1), 10),
                //     }),
                // );

                // const facePolygons = Object.entries(faces).map<{ polygon: number[][]; color: number[] }>(
                //     ([face, faceCorners]) => ({
                //         polygon: [faceCorners[3], faceCorners[2], faceCorners[0], faceCorners[1], faceCorners[3]],
                //         color: DEBUG_DIRECTION_COLORS[face],
                //     }),
                // );

                DEBUG_POLYGONS.push(
                    ...velocityPolygons,

                    // ...facePolygons,
                    // ...directionPolygons,
                );
            }
            // }
        }

        // console.log(">", cellCenterPoints);
        this.setState({
            DEBUG_POLYGONS,
            DEBUG_CENTERS,
            particles,
            cellData,

            // cellCenters: cellCenterPoints,
            // cellOilVelocities: oilVelocities,
            // cellGasVelocities: gasVelocities,
            // cellWaterVelocities: waterVelocities,
        });

        // const cellIndices = []
        // const cellCenters = []
        // const cellVelocities = []

        // for (const phase of Object.keys(data.phaseFlux) as Phase[]) {
        //     if (!activePhasesShown[phase]) {
        //         continue;
        //     }
        //     const phaseFlux = data.phaseFlux[phase];
        //     if (phaseFlux) {
        //         arrows.push(
        //             ...buildFluxArrowsForPhase(
        //                 data,
        //                 phase,
        //                 phaseFlux,
        //                 activeDirectionsShown,
        //                 effectiveMinLength,
        //                 effectiveMaxLength,
        //             ),
        //         );
        //     }
        // }
    }

    renderLayers(): Layer | null | LayersList {
        // console.log("cellWaterVelocities....", this.state.cellWaterVelocities);
        // console.log(this.state.cellData, );

        return [
            // new ScatterplotLayer({
            //     ...this.getSubLayerProps({ id: SubLayerId.CELL_CENTERS }),
            //     data: this.state.cellCenters,
            //     getPosition: (d: Vec3) => [d.x, d.y, d.z],
            //     radiusMinPixels: 2,
            //     getRadius: 6,
            //     billboard: true,
            //     visible: false,
            // }),

            new ScatterplotLayer({
                ...this.getSubLayerProps({ id: SubLayerId.CELL_CENTERS }),
                data: this.state.particles,
                getPosition: (d) => getParticlePosition(d, this.state.cellData),
                getFillColor: [255, 0, 0],
                getRadius: 1,
                billboard: true,
                pickable: true,
            }),
            // new SolidPolygonLayer({
            //     ...this.getSubLayerProps({ id: SubLayerId.OIL_VELOCITY }),
            //     data: this.state.cellOilVelocities,
            //     getPolygon: (vel: Vec3, { index }) => makeArrowPolygon(this.state.cellCenters[index], vel, length(vel)),
            //     getFillColor: PHASE_COLORS_RGB.oil,
            //     getLineColor: PHASE_COLORS_RGB.oil,
            //     opacity: 0.5,
            // }),

            // DEBUG
            new SolidPolygonLayer({
                ...this.getSubLayerProps({ id: "DEB_FACES" }),
                _full3d: true, // Allows vertical faces
                data: this.state.DEBUG_POLYGONS,
                pickable: true,

                opacity: 0.1,
                getFillColor: (d) => d.color,
                // lineBillboard: true,
                // textBillboard: true,
                // wireframe: true,
                // extruded: true,

                // opacity: ,

                // getLineColor: [0, 0, 0, 0],
            }),

            new SolidPolygonLayer({
                ...this.getSubLayerProps({ id: "DEB_PARTICLE_VELOCITY" }),
                // _full3d: true, // Allows vertical faces
                data: this.state.particles,

                getPolygon: (d: ParticleData) => {
                    const currentCell = this.state.cellData[d.cell!];
                    if (!currentCell) return [];

                    // TODO: 3D
                    const { u, v, w } = d;

                    // Interpolate velocity using Pollock method
                    const velocity = {
                        x:
                            currentCell.velocityIMinus.x * (1 - u) +
                            currentCell.velocityIPlus.x * u +
                            currentCell.velocityJMinus.x * (1 - v) +
                            currentCell.velocityJPlus.x * v,
                        y:
                            currentCell.velocityIMinus.y * (1 - u) +
                            currentCell.velocityIPlus.y * u +
                            currentCell.velocityJMinus.y * (1 - v) +
                            currentCell.velocityJPlus.y * v,
                        z:
                            currentCell.velocityIMinus.z * (1 - u) +
                            currentCell.velocityIPlus.z * u +
                            currentCell.velocityJMinus.z * (1 - v) +
                            currentCell.velocityJPlus.z * v,
                    };

                    // Create arrow polygon for the particle's velocity
                    return makeArrowPolygon(
                        fromArray(getParticlePosition(d, this.state.cellData)),
                        velocity,
                        length(velocity) * 2,
                    );
                },

                // opacity: 0.4,
                // getFillColor: (d) => d.color,
                // lineBillboard: true,
                // textBillboard: true,
                // wireframe: true,
                // extruded: true,

                // opacity: ,

                // getLineColor: [0, 0, 0, 0],
            }),

            // new ScatterplotLayer({
            //     ...this.getSubLayerProps({ id: "DEB_CENT" }),
            //     data: this.state.DEBUG_CENTERS,
            //     getPosition: (d: Vec3) => [d.x, d.y, d.z],
            //     radiusMinPixels: 2,
            //     getRadius: 3,
            //     billboard: true,
            //     opacity: 0.2,
            //     // visible: false,
            // }),

            // new SolidPolygonLayer({
            //     ...this.getSubLayerProps({ id: SubLayerId.WATER_VELOCITY }),
            //     data: this.state.cellWaterVelocities,
            //     getPolygon: (vel: Vec3, { index }) => makeArrowPolygon(this.state.cellCenters[index], vel, length(vel)),
            //     getFillColor: PHASE_COLORS_RGB.water,
            //     getLineColor: PHASE_COLORS_RGB.water,
            //     opacity: 0.5,
            // }),

            // new SolidPolygonLayer({
            //     ...this.getSubLayerProps({ id: SubLayerId.GAS_VELOCITY }),
            //     data: this.state.cellGasVelocities,
            //     getPolygon: (vel: Vec3, { index }) => makeArrowPolygon(this.state.cellCenters[index], vel, length(vel)),
            //     getFillColor: PHASE_COLORS_RGB.gas,
            //     getLineColor: PHASE_COLORS_RGB.gas,
            //     opacity: 0.5,
            // }),
            //         data: arrows,
            //         getPolygon: (d: ArrowDatum) => d.polygon,
            //         getFillColor: (d: ArrowDatum) => d.color,
            //         filled: true,
            //         stroked: false,
            //         pickable: false,
            //     }),
            // ),
        ];
    }
}

function getParticlePosition(particle: ParticleData, cellData: (CellData | null)[]): Position {
    // TODO: The particle should be killed before this
    if (particle.cell === null) return [0, 0, 0];

    // Particles are only added to enabled cells
    const currentCell = cellData[particle.cell]!;

    return [
        // X
        trilinearInterpolateValue(
            particle.u,
            particle.v,
            particle.w,
            currentCell.corners.map((c) => c[0]),
        ),
        // Y
        trilinearInterpolateValue(
            particle.u,
            particle.v,
            particle.w,
            currentCell.corners.map((c) => c[1]),
        ),

        // Z
        trilinearInterpolateValue(
            particle.u,
            particle.v,
            particle.w,
            currentCell.corners.map((c) => c[2]),
        ),
    ];
}

function trilinearInterpolateValue(u: number, v: number, w: number, targets: number[]) {
    return (
        targets[0] * (1 - u) * (1 - v) * (1 - w) +
        targets[1] * u * (1 - v) * (1 - w) +
        targets[2] * (1 - u) * v * (1 - w) +
        targets[3] * u * v * (1 - w) +
        targets[4] * (1 - u) * (1 - v) * w +
        targets[5] * u * (1 - v) * w +
        targets[6] * (1 - u) * v * w +
        targets[7] * u * v * w
    );
}

function getCellFaces(cellCornersFloat32Arr: Float32Array, cellIndex: number) {
    return {
        iPlus: I_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        iMinus: I_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        jPlus: J_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        jMinus: J_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        kPlus: K_PLUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
        kMinus: K_MINUS_FACE_CORNERS.map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner)),
    };
}

function getCenter(corners: number[][]) {
    const center: Vec3 = { x: 0, y: 0, z: 0 };

    for (let cornerIdx = 0; cornerIdx < corners.length; cornerIdx++) {
        center.x += corners[cornerIdx][0];
        center.y += corners[cornerIdx][1];
        center.z += corners[cornerIdx][2];
    }

    center.x /= corners.length;
    center.y /= corners.length;
    center.z /= corners.length;

    // center.z *= -1;

    return toArray(center);
}

function getFlux(fluxes: GridCellFluxData["phaseFlux"], phase: Phase, direction: Direction, cellIndex: number | null) {
    if (cellIndex === null) return 0;
    if (!fluxes[phase]) return 0;

    const fluxKey = DIRECTION_TO_FLUX_KEY_MAP[direction];
    return fluxes[phase][fluxKey][cellIndex];
}

function getCellCenter(cellCornersFloat32Arr: Float32Array, cellIndex: number): number[] {
    const baseIndex = cellIndex * 24;
    const center: Vec3 = { x: 0, y: 0, z: 0 };

    for (let corner = 0; corner < 8; corner++) {
        const cornerIndex = baseIndex + corner * 3;
        center.x += cellCornersFloat32Arr[cornerIndex];
        center.y += cellCornersFloat32Arr[cornerIndex + 1];
        center.z += cellCornersFloat32Arr[cornerIndex + 2];
    }

    center.x /= 8;
    center.y /= 8;
    center.z /= 8;

    center.z *= -1;

    return toArray(center);
}

function getOutwardFromCenter(center: number[], faceCenter: number[]): Vec3 {
    // Side are not 90 deg against the top and bottom, so flow direction will be the direction from the center, not the normal

    return {
        x: faceCenter[0] - center[0],
        y: faceCenter[1] - center[1],
        z: faceCenter[2] - center[2],
    };
}

function getCellCorners(cellCornersFloat32Arr: Float32Array, cellIndex: number): number[][] {
    return range(0, 8).map((corner) => getCellCorner(cellCornersFloat32Arr, cellIndex, corner));
}

// Grid Z is depth (increasing downward, TVD-style); negate for a Z-up world, same
// convention makeGridCellFluxBoundingBox uses and that Grid3DLayer applies internally
// via its own ZIncreasingDownwards flag -- LineLayer/SolidPolygonLayer/TextLayer have
// no equivalent, so it has to happen here instead.
function getCellCorner(cellCornersFloat32Arr: Float32Array, cellIndex: number, corner: number): number[] {
    const offset = cellIndex * 24 + corner * 3;
    return [cellCornersFloat32Arr[offset], cellCornersFloat32Arr[offset + 1], -cellCornersFloat32Arr[offset + 2]];
}

function computeFaceArea(corners: number[][]) {
    /*
        0     1
           
        2     3
    */

    // The face is an irregular polygon. It's area is the sum of the two triangles it makes
    const triangle1 = [corners[0], corners[1], corners[2]];
    const triangle2 = [corners[1], corners[2], corners[3]];

    return computeTriangleArea(triangle1) + computeTriangleArea(triangle2);
}
function computeTriangleArea(corners: number[][]) {
    /*
           0

        2     1
    */

    const [v0, v1, v2] = corners.map(fromArray);

    const ab = subtract(v1, v0);
    const ac = subtract(v2, v0);

    const crossP = cross(ab, ac);

    return length(crossP) * 0.5;
}

function getCellNeighborIndices(cellIndex: number, nx: number, ny: number, k: number) {
    return {
        iPlus: cellIndex + 1 < nx * ny ? cellIndex + 1 : null,
        iMinus: cellIndex - 1 >= 0 ? cellIndex - 1 : null,
        jPlus: cellIndex + nx < nx * ny ? cellIndex + nx : null,
        jMinus: cellIndex - nx >= 0 ? cellIndex - nx : null,
        kPlus: k + 1 < k ? cellIndex + nx * ny : null,
        kMinus: k - 1 >= 0 ? cellIndex - nx * ny : null,
    };
}

function makeArrowPolygon(basePosition: Vec3, direction: Vec3, length: number) {
    // console.log("make arrow for", basePosition, direction, length);

    const [dx, dy, dz] = toArray(direction);
    const dirLen = Math.hypot(dx, dy, dz) || 1;
    const ndx = dx / dirLen;
    const ndy = dy / dirLen;
    const ndz = dz / dirLen;

    // Perpendicular via cross product with a stable reference axis.
    const ref = Math.abs(ndz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let rx = ndy * ref[2] - ndz * ref[1];
    let ry = ndz * ref[0] - ndx * ref[2];
    let rz = ndx * ref[1] - ndy * ref[0];
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    const [px, py, pz] = toArray(basePosition);
    const along = (s: number) => [px + ndx * s, py + ndy * s, pz + ndz * s];
    const point = (s: number, w: number) => {
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
