import React from "react";

import { OrbitView } from "@deck.gl/core";
import SubsurfaceViewer from "@webviz/subsurface-viewer";

import type { ModuleViewProps } from "@framework/Module";
import type { VectorDatum } from "@modules/_shared/customDeckGlLayers/ParticleStreamlineLayer";
import { ParticleStreamlineLayer } from "@modules/_shared/customDeckGlLayers/ParticleStreamlineLayer";
import type { ColorMappingFn } from "@modules/_shared/customDeckGlLayers/VectorMagnitudeLayer";
import { VectorMagnitudeLayer } from "@modules/_shared/customDeckGlLayers/VectorMagnitudeLayer";

import type { ColorPreset, DatasetType } from "./atoms";
import type { Interfaces } from "./interfaces";

// ── Dataset generators ─────────────────────────────────────────────────────────

const GRID_N_2D = 20;
const GRID_N_3D = 8;
const FIELD_HALF = 500;

function generateDataset(type: DatasetType, time: number): VectorDatum[] {
    const vectors: VectorDatum[] = [];
    const is3D = type === "helix" || type === "sphere" || type === "abc" || type === "wave" || type === "lorenz" || type === "tornado";

    if (is3D) {
        const spacing = (FIELD_HALF * 2) / GRID_N_3D;
        const phi = time * 2 * Math.PI;

        for (let i = 0; i < GRID_N_3D; i++) {
            for (let j = 0; j < GRID_N_3D; j++) {
                for (let k = 0; k < GRID_N_3D; k++) {
                    const x = (i - GRID_N_3D / 2 + 0.5) * spacing;
                    const y = (j - GRID_N_3D / 2 + 0.5) * spacing;
                    const z = (k - GRID_N_3D / 2 + 0.5) * spacing;
                    const r2 = Math.hypot(x, y) || 1e-6;
                    const r3 = Math.hypot(x, y, z) || 1e-6;

                    let vx: number, vy: number, vz: number;

                    switch (type) {
                        case "helix": {
                            // Rankine-like ring: speed peaks at r2 ≈ 0.4·FIELD_HALF, zero at axis
                            const rNorm = r2 / (FIELD_HALF * 0.4);
                            const speed = rNorm * Math.exp(-rNorm * rNorm * 0.5);
                            vx = (-y / r2) * speed;
                            vy = (x / r2) * speed;
                            vz = (0.3 + 0.5 * Math.sin(phi + (z / FIELD_HALF) * Math.PI * 2)) * speed;
                            break;
                        }
                        case "sphere": {
                            // Spherical shell: speed peaks at r3 ≈ 0.5·FIELD_HALF
                            const rPeak = FIELD_HALF * 0.5;
                            const rSigma = FIELD_HALF * 0.3;
                            const speed = Math.exp(-(((r3 - rPeak) / rSigma) ** 2));
                            vx = (x / r3) * speed;
                            vy = (y / r3) * speed;
                            vz = (z / r3) * speed;
                            break;
                        }
                        case "abc": {
                            const scale = Math.PI / FIELD_HALF;
                            const X = x * scale;
                            const Y = y * scale;
                            const Z = z * scale;
                            const A = Math.sqrt(3),
                                B = Math.sqrt(2),
                                C = 1;
                            // Superposition of sin/cos naturally produces large magnitude variation
                            vx = A * Math.sin(Z + phi) + C * Math.cos(Y);
                            vy = B * Math.sin(X) + A * Math.cos(Z + phi);
                            vz = C * Math.sin(Y) + B * Math.cos(X + phi * 0.5);
                            break;
                        }
                        case "wave": {
                            // Standing wave: product of cosines creates clear 3D nodes/antinodes
                            const k = Math.PI / (FIELD_HALF * 0.9);
                            const amp = Math.cos(k * x) * Math.cos(k * y) * Math.cos(k * z - phi * 0.5);
                            vx = amp;
                            vy = amp * 0.6;
                            vz = amp * 0.35;
                            break;
                        }
                        case "lorenz": {
                            // Raw Lorenz velocities: near-zero at fixed points, large elsewhere
                            const lx = (x / FIELD_HALF) * 20;
                            const ly = (y / FIELD_HALF) * 25;
                            const lz = (z / FIELD_HALF) * 20 + 25;
                            const sigma = 10,
                                rho = 28,
                                beta = 8.0 / 3.0;
                            const lvx = sigma * (ly - lx);
                            const lvy = lx * (rho - lz) - ly;
                            const lvz = lx * ly - beta * lz;
                            const rawMag = Math.hypot(lvx, lvy, lvz) || 1e-6;
                            // tanh-squash so corners don't dominate; preserves direction
                            const scaledMag = Math.tanh(rawMag / 100);
                            vx = (lvx / rawMag) * scaledMag;
                            vy = (lvy / rawMag) * scaledMag;
                            vz = (lvz / rawMag) * scaledMag;
                            break;
                        }
                        case "tornado": {
                            const r2d = Math.hypot(x, y) || 0.01;
                            const taper = Math.max(0, 1 - (z / FIELD_HALF) ** 2);
                            const inflow = Math.exp(-((r2d / (FIELD_HALF * 0.6)) ** 2));
                            vx = (-y / r2d) * taper - (x / r2d) * inflow * 0.3;
                            vy = (x / r2d) * taper - (y / r2d) * inflow * 0.3;
                            vz = inflow * (1.0 - z / FIELD_HALF) * 0.5;
                            const prec = 0.15 * Math.sin(phi);
                            vx += prec * (z / FIELD_HALF);
                            vy += prec * Math.cos(phi) * (z / FIELD_HALF);
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
    viewports: [{ id: "main", layerIds: ["particle-streamlines", "magnitude-overlay"], viewType: OrbitView }],
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
    const showMagnitudeOverlay = props.viewContext.useSettingsToViewInterfaceValue("showMagnitudeOverlay");
    const magnitudeOpacity = props.viewContext.useSettingsToViewInterfaceValue("magnitudeOpacity");
    const colorScaleSpecification = props.viewContext.useSettingsToViewInterfaceValue("colorScaleSpecification");
    const time = props.viewContext.useSettingsToViewInterfaceValue("time");

    const vectors = React.useMemo(() => generateDataset(datasetType, time), [datasetType, time]);
    const color = COLOR_MAP[colorPreset];

    const colorMappingFn = React.useMemo<ColorMappingFn | undefined>(() => {
        if (!colorScaleSpecification) return undefined;
        const { colorScale } = colorScaleSpecification;
        const min = colorScale.getMin();
        const max = colorScale.getMax();
        return (t: number) => {
            const hex = colorScale.getColorForValue(min + t * (max - min));
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            return [r, g, b];
        };
    }, [colorScaleSpecification]);

    const streamlineLayer = React.useMemo(
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

    const magnitudeLayer = React.useMemo(() => {
        if (!showMagnitudeOverlay) return null;
        return new VectorMagnitudeLayer({
            id: "magnitude-overlay",
            vectors,
            opacity: magnitudeOpacity,
            ...(colorMappingFn ? { colorMappingFn } : {}),
        });
    }, [vectors, showMagnitudeOverlay, magnitudeOpacity, colorMappingFn]);

    const layers = magnitudeLayer ? [magnitudeLayer, streamlineLayer] : [streamlineLayer];

    return (
        <div className="relative w-full h-full">
            <SubsurfaceViewer id="particle-streamlines-debug" layers={layers} bounds={BOUNDS} views={VIEWS} />
            <div className="absolute top-2 right-2 text-xs text-gray-500 pointer-events-none select-none">
                {vectors.length} vectors · {numParticles} particles
            </div>
        </div>
    );
}
