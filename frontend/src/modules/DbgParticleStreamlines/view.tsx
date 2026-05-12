import React from "react";

import { OrbitView } from "@deck.gl/core";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import type { ModuleViewProps } from "@framework/Module";
import type { VectorDatum } from "@modules/_shared/customDeckGlLayers/ParticleStreamlineLayer";
import { ParticleStreamlineLayer } from "@modules/_shared/customDeckGlLayers/ParticleStreamlineLayer";

import type { ColorPreset, DatasetType } from "./atoms";
import type { Interfaces } from "./interfaces";

// ── Dataset generators ─────────────────────────────────────────────────────────

const GRID_N_2D = 20;
const GRID_N_3D = 8;
const FIELD_HALF = 500;

function generateDataset(type: DatasetType): VectorDatum[] {
    const vectors: VectorDatum[] = [];

    if (type === "helix" || type === "sphere" || type === "abc") {
        const spacing = (FIELD_HALF * 2) / GRID_N_3D;

        for (let i = 0; i < GRID_N_3D; i++) {
            for (let j = 0; j < GRID_N_3D; j++) {
                for (let k = 0; k < GRID_N_3D; k++) {
                    const x = (i - GRID_N_3D / 2 + 0.5) * spacing;
                    const y = (j - GRID_N_3D / 2 + 0.5) * spacing;
                    const z = (k - GRID_N_3D / 2 + 0.5) * spacing;
                    const r2 = Math.hypot(x, y) || 1;
                    const r3 = Math.hypot(x, y, z) || 1;

                    let vx: number, vy: number, vz: number;

                    switch (type) {
                        case "helix": {
                            // Corkscrew: rotate around Z axis while drifting upward
                            vx = -y / r2;
                            vy = x / r2;
                            vz = 0.5;
                            break;
                        }
                        case "sphere": {
                            // Diverge radially outward from origin in 3D
                            vx = x / r3;
                            vy = y / r3;
                            vz = z / r3;
                            break;
                        }
                        case "abc": {
                            // Arnold–Beltrami–Childress flow (A=√3, B=√2, C=1)
                            const scale = Math.PI / FIELD_HALF;
                            const X = x * scale;
                            const Y = y * scale;
                            const Z = z * scale;
                            const A = Math.sqrt(3),
                                B = Math.sqrt(2),
                                C = 1;
                            vx = A * Math.sin(Z) + C * Math.cos(Y);
                            vy = B * Math.sin(X) + A * Math.cos(Z);
                            vz = C * Math.sin(Y) + B * Math.cos(X);
                            break;
                        }
                    }

                    vectors.push({ origin: [x, y, z], direction: [vx!, vy!, vz!] });
                }
            }
        }

        return vectors;
    }

    const spacing = (FIELD_HALF * 2) / GRID_N_2D;

    for (let i = 0; i < GRID_N_2D; i++) {
        for (let j = 0; j < GRID_N_2D; j++) {
            const x = (i - GRID_N_2D / 2 + 0.5) * spacing;
            const y = (j - GRID_N_2D / 2 + 0.5) * spacing;
            const r = Math.hypot(x, y) || 1;

            let vx: number, vy: number;

            switch (type) {
                case "vortex": {
                    vx = -y / r;
                    vy = x / r;
                    break;
                }
                case "spiral": {
                    const speed = r / FIELD_HALF;
                    vx = ((-y / r) * 0.85 + (x / r) * 0.15) * speed;
                    vy = ((x / r) * 0.85 + (y / r) * 0.15) * speed;
                    break;
                }
                case "saddle": {
                    vx = x / FIELD_HALF;
                    vy = -y / FIELD_HALF;
                    break;
                }
                case "convergent": {
                    const speed = r / FIELD_HALF;
                    vx = (-x / r) * speed;
                    vy = (-y / r) * speed;
                    break;
                }
            }

            vectors.push({ origin: [x, y, 0], direction: [vx!, vy!, 0] });
        }
    }

    return vectors;
}

// ── Color presets ──────────────────────────────────────────────────────────────

const COLOR_MAP: Record<ColorPreset, [number, number, number]> = {
    orange: [255, 120, 30],
    blue: [40, 140, 255],
    cyan: [0, 210, 230],
    green: [60, 210, 90],
    white: [240, 240, 240],
};

// ── Static config ──────────────────────────────────────────────────────────────

const BOUNDS: [number, number, number, number] = [-FIELD_HALF, -FIELD_HALF, FIELD_HALF, FIELD_HALF];

const VIEWS = {
    layout: [1, 1] as [number, number],
    viewports: [{ id: "main", layerIds: ["particle-streamlines"], viewType: OrbitView }],
};

// ── View component ─────────────────────────────────────────────────────────────

export function View(props: ModuleViewProps<Interfaces>): React.ReactNode {
    const datasetType = props.viewContext.useSettingsToViewInterfaceValue("datasetType");
    const numParticles = props.viewContext.useSettingsToViewInterfaceValue("numParticles");
    const maxAge = props.viewContext.useSettingsToViewInterfaceValue("maxAge");
    const speedFactor = props.viewContext.useSettingsToViewInterfaceValue("speedFactor");
    const opacity = props.viewContext.useSettingsToViewInterfaceValue("opacity");
    const lineWidth = props.viewContext.useSettingsToViewInterfaceValue("lineWidth");
    const trailSteps = props.viewContext.useSettingsToViewInterfaceValue("trailSteps");
    const trailLength = props.viewContext.useSettingsToViewInterfaceValue("trailLength");
    const colorPreset = props.viewContext.useSettingsToViewInterfaceValue("colorPreset");

    const vectors = React.useMemo(() => generateDataset(datasetType), [datasetType]);
    const color = COLOR_MAP[colorPreset];

    const layer = React.useMemo(
        () =>
            new ParticleStreamlineLayer({
                id: "particle-streamlines",
                vectors,
                numParticles,
                maxAge,
                speedFactor,
                opacity,
                lineWidth,
                trailSteps,
                trailLength,
                color,
            }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [vectors, numParticles, maxAge, speedFactor, opacity, lineWidth, trailSteps, trailLength, colorPreset],
    );

    return (
        <div className="relative w-full h-full">
            <SubsurfaceViewer id="particle-streamlines-debug" layers={[layer]} bounds={BOUNDS} views={VIEWS} />
            <div className="absolute top-2 right-2 text-xs text-gray-500 pointer-events-none select-none">
                {vectors.length} vectors · {numParticles} particles
            </div>
        </div>
    );
}
