import { CompositeLayer, type CompositeLayerProps, type Layer, type UpdateParameters } from "@deck.gl/core";
import { LineLayer, SolidPolygonLayer } from "@deck.gl/layers";

// ── Public types ─────────────────────────────────────────────────────────────

export type VectorDatum = {
    origin: [number, number, number];
    direction: [number, number, number]; // magnitude encodes field speed
};

export type ParticleStreamlineLayerProps = CompositeLayerProps & {
    vectors: VectorDatum[];

    // Integration
    stepSize?: number; // arc-length step in world units (default: auto from avg spacing)
    numSteps?: number; // max RK4 steps per streamline (default: 100)

    // Particles
    numParticles?: number; // total animated particles (default: 200)
    maxAge?: number; // particle lifetime in seconds (default: 2)
    speedFactor?: number; // multiplier: 1 = avg traversal time equals maxAge (default: 1)

    // Appearance
    color?: [number, number, number]; // RGB 0–255 (default: [255, 120, 30])
    opacity?: number; // 0–1 (default: 0.8)
    arrowSize?: number; // arrow size in world units (default: auto from avg spacing)
    lineWidth?: number; // line width in pixels (default: 2)
    trailSteps?: number; // number of fading trail segments behind each arrow (default: 8)
    trailLength?: number; // trail length as fraction of streamline total length (default: 0.15)
};

// ── Internal types ────────────────────────────────────────────────────────────

type Streamline = {
    points: [number, number, number][];
    directions: [number, number, number][];
    normMagnitudes: number[]; // local magnitude / mean magnitude along this streamline
    lengths: number[]; // cumulative arc lengths
    totalLength: number;
};

type Particle = {
    streamlineIdx: number;
    arcLength: number;
    age: number;
    lifetime: number; // jittered per-particle max age
};

type ArrowPolygon = {
    polygon: [number, number, number][];
    alpha: number;
};

type TrailSegment = {
    source: [number, number, number];
    target: [number, number, number];
    alpha: number;
};

// ── Spatial grid (IDW interpolation) ─────────────────────────────────────────

type SpatialGrid3D = {
    cells: Map<string, VectorDatum[]>;
    cellSize: number;
    ox: number;
    oy: number;
    oz: number;
};

function buildGrid(vectors: VectorDatum[]): SpatialGrid3D {
    if (!vectors.length) return { cells: new Map(), cellSize: 1, ox: 0, oy: 0, oz: 0 };

    let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;

    for (const v of vectors) {
        minX = Math.min(minX, v.origin[0]);
        minY = Math.min(minY, v.origin[1]);
        minZ = Math.min(minZ, v.origin[2]);
        maxX = Math.max(maxX, v.origin[0]);
        maxY = Math.max(maxY, v.origin[1]);
        maxZ = Math.max(maxZ, v.origin[2]);
    }

    const xSpan = Math.max(maxX - minX, 1e-9);
    const ySpan = Math.max(maxY - minY, 1e-9);
    const zSpan = maxZ - minZ;

    const avgSpacing =
        zSpan < 1e-6
            ? Math.sqrt((xSpan * ySpan) / vectors.length)
            : Math.cbrt((xSpan * ySpan * zSpan) / vectors.length);

    const cellSize = Math.max(avgSpacing * 1.5, 1e-6);

    const cells = new Map<string, VectorDatum[]>();

    for (const v of vectors) {
        const key = gridKey(v.origin[0], v.origin[1], v.origin[2], minX, minY, minZ, cellSize);
        let cell = cells.get(key);
        if (!cell) {
            cell = [];
            cells.set(key, cell);
        }
        cell.push(v);
    }

    return { cells, cellSize, ox: minX, oy: minY, oz: minZ };
}

function gridKey(x: number, y: number, z: number, ox: number, oy: number, oz: number, cellSize: number): string {
    const cx = Math.floor((x - ox) / cellSize);
    const cy = Math.floor((y - oy) / cellSize);
    const cz = Math.floor((z - oz) / cellSize);
    return `${cx},${cy},${cz}`;
}

function queryGrid(x: number, y: number, z: number, grid: SpatialGrid3D): [number, number, number] {
    const { cells, cellSize, ox, oy, oz } = grid;
    const cx = Math.floor((x - ox) / cellSize);
    const cy = Math.floor((y - oy) / cellSize);
    const cz = Math.floor((z - oz) / cellSize);

    let wx = 0,
        wy = 0,
        wz = 0,
        wt = 0;

    for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dz = -2; dz <= 2; dz++) {
                const cell = cells.get(`${cx + dx},${cy + dy},${cz + dz}`);
                if (!cell) continue;
                for (const v of cell) {
                    const ex = x - v.origin[0];
                    const ey = y - v.origin[1];
                    const ez = z - v.origin[2];
                    const d2 = ex * ex + ey * ey + ez * ez;
                    if (d2 < 1e-14) return [v.direction[0], v.direction[1], v.direction[2]];
                    const w = 1 / (d2 * d2); // IDW power 4 for sharper locality
                    wx += w * v.direction[0];
                    wy += w * v.direction[1];
                    wz += w * v.direction[2];
                    wt += w;
                }
            }
        }
    }

    return wt > 0 ? [wx / wt, wy / wt, wz / wt] : [0, 0, 0];
}

// ── RK4 streamline integration ────────────────────────────────────────────────

function normalizedVec(v: [number, number, number]): [number, number, number] | null {
    const m = Math.hypot(v[0], v[1], v[2]);
    return m > 1e-12 ? [v[0] / m, v[1] / m, v[2] / m] : null;
}

function rk4Step(x: number, y: number, z: number, grid: SpatialGrid3D, h: number): [number, number, number] | null {
    const k1 = normalizedVec(queryGrid(x, y, z, grid));
    if (!k1) return null;
    const k2 = normalizedVec(queryGrid(x + 0.5 * h * k1[0], y + 0.5 * h * k1[1], z + 0.5 * h * k1[2], grid));
    if (!k2) return null;
    const k3 = normalizedVec(queryGrid(x + 0.5 * h * k2[0], y + 0.5 * h * k2[1], z + 0.5 * h * k2[2], grid));
    if (!k3) return null;
    const k4 = normalizedVec(queryGrid(x + h * k3[0], y + h * k3[1], z + h * k3[2], grid));
    if (!k4) return null;
    return [
        (h * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0])) / 6,
        (h * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1])) / 6,
        (h * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2])) / 6,
    ];
}

function integrateOne(
    seed: [number, number, number],
    grid: SpatialGrid3D,
    stepSize: number,
    numSteps: number,
    bounds: [number, number, number, number, number, number],
): Streamline {
    const points: [number, number, number][] = [[seed[0], seed[1], seed[2]]];
    const directions: [number, number, number][] = [];
    const magnitudes: number[] = [];
    const lengths: number[] = [0];
    let totalLength = 0;
    let x = seed[0],
        y = seed[1],
        z = seed[2];

    const seedVec = queryGrid(x, y, z, grid);
    const seedMag = Math.hypot(seedVec[0], seedVec[1], seedVec[2]);
    magnitudes.push(seedMag);
    directions.push(seedMag > 1e-12 ? [seedVec[0] / seedMag, seedVec[1] / seedMag, seedVec[2] / seedMag] : [1, 0, 0]);

    for (let i = 0; i < numSteps; i++) {
        const step = rk4Step(x, y, z, grid, stepSize);
        if (!step) break;

        x += step[0];
        y += step[1];
        z += step[2];

        if (x < bounds[0] || x > bounds[3] || y < bounds[1] || y > bounds[4] || z < bounds[2] || z > bounds[5]) break;

        const vec = queryGrid(x, y, z, grid);
        const mag = Math.hypot(vec[0], vec[1], vec[2]);

        totalLength += stepSize;
        lengths.push(totalLength);
        points.push([x, y, z]);
        magnitudes.push(mag);

        const normVec = normalizedVec(vec);
        directions.push(normVec ?? [step[0] / stepSize, step[1] / stepSize, step[2] / stepSize]);
    }

    const meanMag = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const normMagnitudes = magnitudes.map((m) => (meanMag > 0 ? m / meanMag : 1));

    return { points, directions, normMagnitudes, lengths, totalLength };
}

function computeStreamlines(vectors: VectorDatum[], stepSize: number, numSteps: number): Streamline[] {
    if (!vectors.length) return [];

    let minX = Infinity,
        minY = Infinity,
        minZ = Infinity;
    let maxX = -Infinity,
        maxY = -Infinity,
        maxZ = -Infinity;
    for (const v of vectors) {
        if (v.origin[0] < minX) minX = v.origin[0];
        if (v.origin[1] < minY) minY = v.origin[1];
        if (v.origin[2] < minZ) minZ = v.origin[2];
        if (v.origin[0] > maxX) maxX = v.origin[0];
        if (v.origin[1] > maxY) maxY = v.origin[1];
        if (v.origin[2] > maxZ) maxZ = v.origin[2];
    }

    const m = stepSize * 3;
    const bounds: [number, number, number, number, number, number] = [
        minX - m,
        minY - m,
        minZ - m,
        maxX + m,
        maxY + m,
        maxZ + m,
    ];

    const grid = buildGrid(vectors);
    return vectors.map((v) => integrateOne(v.origin, grid, stepSize, numSteps, bounds));
}

// ── Streamline arc-length sampling ────────────────────────────────────────────

function sampleStreamline(
    sl: Streamline,
    arcLength: number,
): { position: [number, number, number]; direction: [number, number, number]; normMag: number } {
    const { points, directions, normMagnitudes, lengths, totalLength } = sl;
    if (points.length === 1) return { position: points[0], direction: directions[0], normMag: normMagnitudes[0] };

    const s = Math.min(Math.max(arcLength, 0), totalLength);
    let lo = 0,
        hi = lengths.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (lengths[mid] <= s) lo = mid;
        else hi = mid;
    }
    const span = lengths[hi] - lengths[lo];
    const t = span > 1e-12 ? (s - lengths[lo]) / span : 0;

    const position: [number, number, number] = [
        points[lo][0] + t * (points[hi][0] - points[lo][0]),
        points[lo][1] + t * (points[hi][1] - points[lo][1]),
        points[lo][2] + t * (points[hi][2] - points[lo][2]),
    ];

    let dx = directions[lo][0] + t * (directions[hi][0] - directions[lo][0]);
    let dy = directions[lo][1] + t * (directions[hi][1] - directions[lo][1]);
    let dz = directions[lo][2] + t * (directions[hi][2] - directions[lo][2]);
    const dm = Math.hypot(dx, dy, dz);
    if (dm > 1e-12) {
        dx /= dm;
        dy /= dm;
        dz /= dm;
    }

    const normMag = normMagnitudes[lo] + t * (normMagnitudes[hi] - normMagnitudes[lo]);
    return { position, direction: [dx, dy, dz], normMag };
}

// ── Arrow geometry ─────────────────────────────────────────────────────────────

// Returns a filled triangle with base at `position` and tip pointing in `direction`.
// The trail should end at `position` so the base of the arrow caps the trail cleanly.
function makeArrow(
    position: [number, number, number],
    direction: [number, number, number],
    arrowSize: number,
): [number, number, number][] {
    const [px, py, pz] = position;
    const [dx, dy, dz] = direction;

    // True 3D perpendicular via cross product with a stable reference axis.
    // Use Z-up for horizontal/2D vectors; fall back to X for near-vertical ones.
    const ref: [number, number, number] = Math.abs(dz) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let rx = dy * ref[2] - dz * ref[1];
    let ry = dz * ref[0] - dx * ref[2];
    let rz = dx * ref[1] - dy * ref[0];
    const rLen = Math.hypot(rx, ry, rz) || 1;
    rx /= rLen;
    ry /= rLen;
    rz /= rLen;

    const hw = arrowSize * 0.4;

    const tip: [number, number, number] = [px + dx * arrowSize, py + dy * arrowSize, pz + dz * arrowSize];
    const baseLeft: [number, number, number] = [px + rx * hw, py + ry * hw, pz + rz * hw];
    const baseRight: [number, number, number] = [px - rx * hw, py - ry * hw, pz - rz * hw];

    return [baseLeft, tip, baseRight];
}

// ── Particle initialisation ────────────────────────────────────────────────────

function initParticles(streamlines: Streamline[], numParticles: number, maxAge: number): Particle[] {
    if (!streamlines.length) return [];
    const validStreamlines = streamlines
        .map((sl, i) => ({ sl, i }))
        .filter(({ sl }) => sl.totalLength > 1e-10 && sl.points.length >= 2);
    if (!validStreamlines.length) return [];

    return Array.from({ length: numParticles }, () => {
        const { i } = validStreamlines[Math.floor(Math.random() * validStreamlines.length)];
        const sl = streamlines[i];
        return {
            streamlineIdx: i,
            arcLength: Math.random() * sl.totalLength,
            age: Math.random() * maxAge, // stagger initial phases
            lifetime: maxAge * (0.8 + 0.4 * Math.random()),
        };
    });
}

// ── Layer ──────────────────────────────────────────────────────────────────────

export class ParticleStreamlineLayer extends CompositeLayer<ParticleStreamlineLayerProps> {
    static layerName = "ParticleStreamlineLayer";

    static defaultProps = {
        vectors: { type: "array" as const, value: [] as VectorDatum[], compare: false },
        stepSize: { type: "number" as const, value: null, equal: false },
        numSteps: { type: "number" as const, value: 100 },
        numParticles: { type: "number" as const, value: 200 },
        maxAge: { type: "number" as const, value: 2 },
        speedFactor: { type: "number" as const, value: 1 },
        color: { type: "array" as const, value: [255, 120, 30] as [number, number, number] },
        opacity: { type: "number" as const, value: 0.8 },
        arrowSize: { type: "number" as const, value: null, equal: false },
        lineWidth: { type: "number" as const, value: 2 },
        trailSteps: { type: "number" as const, value: 8 },
        trailLength: { type: "number" as const, value: 0.15 },
    };

    // @ts-expect-error - deck.gl state typing convention
    state!: {
        streamlines: Streamline[];
        particles: Particle[];
        lastTimestamp: number | null;
        autoStepSize: number;
        autoArrowSize: number;
        speedFactor: number;
        maxAge: number;
    };

    private _animationFrame: number | null = null;

    initializeState(): void {
        const { streamlines, autoStepSize, autoArrowSize } = this._computeStreamlines();
        const maxAge = this.props.maxAge ?? 2;
        this.setState({
            streamlines,
            autoStepSize,
            autoArrowSize,
            particles: initParticles(streamlines, this.props.numParticles ?? 200, maxAge),
            lastTimestamp: null,
            speedFactor: this.props.speedFactor ?? 1,
            maxAge,
        });
        this._startAnimation();
    }

    updateState({
        props,
        oldProps,
    }: UpdateParameters<Layer<ParticleStreamlineLayerProps & Required<CompositeLayerProps>>>): void {
        const integrationChanged =
            props.vectors !== oldProps.vectors ||
            props.stepSize !== oldProps.stepSize ||
            props.numSteps !== oldProps.numSteps;

        if (integrationChanged) {
            const { streamlines, autoStepSize, autoArrowSize } = this._computeStreamlines();
            this.setState({
                streamlines,
                autoStepSize,
                autoArrowSize,
                particles: initParticles(streamlines, props.numParticles ?? 200, props.maxAge ?? 2),
            });
            return;
        }

        if (props.speedFactor !== oldProps.speedFactor) {
            this.setState({ speedFactor: props.speedFactor ?? 1 });
        }

        if (props.numParticles !== oldProps.numParticles || props.maxAge !== oldProps.maxAge) {
            this.setState({
                maxAge: props.maxAge ?? 2,
                particles: initParticles(this.state.streamlines, props.numParticles ?? 200, props.maxAge ?? 2),
            });
        }
    }

    finalizeState(): void {
        this._stopAnimation();
    }

    private _computeStreamlines(): { streamlines: Streamline[]; autoStepSize: number; autoArrowSize: number } {
        const { vectors, stepSize, numSteps } = this.props;
        if (!vectors?.length) return { streamlines: [], autoStepSize: 1, autoArrowSize: 10 };

        let minX = Infinity,
            minY = Infinity;
        let maxX = -Infinity,
            maxY = -Infinity;
        for (const v of vectors) {
            if (v.origin[0] < minX) minX = v.origin[0];
            if (v.origin[1] < minY) minY = v.origin[1];
            if (v.origin[0] > maxX) maxX = v.origin[0];
            if (v.origin[1] > maxY) maxY = v.origin[1];
        }
        const area = (maxX - minX) * (maxY - minY);
        const avgSpacing = area > 0 ? Math.sqrt(area / vectors.length) : 1;

        const autoStepSize = stepSize ?? avgSpacing * 0.5;
        const autoArrowSize = avgSpacing * 0.1;

        return {
            streamlines: computeStreamlines(vectors, autoStepSize, numSteps ?? 100),
            autoStepSize,
            autoArrowSize,
        };
    }

    private _startAnimation(): void {
        const animate = (timestamp: number) => {
            const { lastTimestamp, streamlines, particles } = this.state;
            const dt =
                lastTimestamp !== null
                    ? Math.min((timestamp - lastTimestamp) / 1000, 0.1) // cap at 100ms to handle tab switching
                    : 0;

            if (dt > 0 && particles.length && streamlines.length) {
                const { speedFactor, maxAge } = this.state;

                const updatedParticles = particles.map((p): Particle => {
                    const sl = streamlines[p.streamlineIdx];
                    if (!sl || sl.totalLength < 1e-10) return p;

                    const { normMag } = sampleStreamline(sl, p.arcLength);
                    const baseSpeed = sl.totalLength / maxAge;
                    const newArcLength = p.arcLength + dt * baseSpeed * speedFactor * normMag;
                    const newAge = p.age + dt;

                    if (newAge >= p.lifetime || newArcLength >= sl.totalLength) {
                        const newIdx =
                            streamlines.length > 1 ? Math.floor(Math.random() * streamlines.length) : p.streamlineIdx;
                        return {
                            streamlineIdx: newIdx,
                            arcLength: 0,
                            age: 0,
                            lifetime: maxAge * (0.8 + 0.4 * Math.random()),
                        };
                    }

                    return { ...p, arcLength: newArcLength, age: newAge };
                });

                this.setState({ particles: updatedParticles, lastTimestamp: timestamp });
            } else {
                this.setState({ lastTimestamp: timestamp });
            }

            this.setNeedsUpdate();
            this._animationFrame = requestAnimationFrame(animate);
        };

        this._animationFrame = requestAnimationFrame(animate);
    }

    private _stopAnimation(): void {
        if (this._animationFrame !== null) {
            cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
        }
    }

    renderLayers(): Layer[] {
        const { streamlines, particles, autoArrowSize } = this.state;
        if (!streamlines?.length || !particles?.length) return [];

        const {
            color = [255, 120, 30] as [number, number, number],
            opacity = 0.8,
            lineWidth = 2,
            trailSteps = 8,
            trailLength = 0.15,
        } = this.props;
        const arrowSize = this.props.arrowSize ?? autoArrowSize;

        const arrowPolygons: ArrowPolygon[] = [];
        const trailSegments: TrailSegment[] = [];

        for (const p of particles) {
            const sl = streamlines[p.streamlineIdx];
            if (!sl || sl.points.length < 2) continue;

            // Sinusoidal envelope: alpha = 0 at birth/death, peak at mid-life
            const lifePhase = p.age / p.lifetime;
            const envelope = Math.sin(lifePhase * Math.PI);

            // Arrowhead: base sits at current position, tip points forward
            const { position, direction } = sampleStreamline(sl, p.arcLength);
            arrowPolygons.push({ polygon: makeArrow(position, direction, arrowSize), alpha: envelope });

            // Fading trail behind the arrow: sample trailSteps+1 points behind current position
            const tailReach = sl.totalLength * trailLength;
            let prev = position;
            for (let i = 1; i <= trailSteps; i++) {
                const t = i / trailSteps; // 0 = head, 1 = tail
                const s = Math.max(0, p.arcLength - tailReach * t);
                const { position: curr } = sampleStreamline(sl, s);

                // Alpha fades linearly to 0 at tail, multiplied by life envelope
                const segAlpha = (1 - t) * envelope;
                trailSegments.push({ source: prev, target: curr, alpha: segAlpha });

                prev = curr;
            }
        }

        return [
            new LineLayer(
                this.getSubLayerProps({
                    id: "trails",
                    data: trailSegments,
                    getSourcePosition: (d: TrailSegment) => d.source,
                    getTargetPosition: (d: TrailSegment) => d.target,
                    getColor: (d: TrailSegment) => [color[0], color[1], color[2], Math.round(d.alpha * opacity * 255)],
                    getWidth: autoArrowSize * lineWidth * 0.15,
                    widthUnits: "meters",
                    widthMinPixels: 1,
                    parameters: { depthTest: false },
                }),
            ),
            new SolidPolygonLayer(
                this.getSubLayerProps({
                    id: "arrows",
                    data: arrowPolygons,
                    getPolygon: (d: ArrowPolygon) => d.polygon,
                    getFillColor: (d: ArrowPolygon) => [
                        color[0],
                        color[1],
                        color[2],
                        Math.round(d.alpha * opacity * 255),
                    ],
                    filled: true,
                    stroked: false,
                    parameters: { depthTest: false },
                }),
            ),
        ];
    }
}
