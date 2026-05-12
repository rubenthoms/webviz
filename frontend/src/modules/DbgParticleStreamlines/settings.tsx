import type React from "react";

import { useAtom } from "jotai";

import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";

import type { ColorPreset, DatasetType } from "./atoms";
import {
    colorPresetAtom,
    datasetTypeAtom,
    lineWidthAtom,
    maxAgeAtom,
    numParticlesAtom,
    opacityAtom,
    speedFactorAtom,
    trailLengthAtom,
    trailStepsAtom,
} from "./atoms";

const DATASET_OPTIONS = [
    { value: "vortex", label: "2D · Vortex (uniform speed)" },
    { value: "spiral", label: "2D · Spiral (speed ∝ radius)" },
    { value: "saddle", label: "2D · Saddle point" },
    { value: "convergent", label: "2D · Convergent (speed ∝ radius)" },
    { value: "helix", label: "3D · Helix (corkscrew)" },
    { value: "sphere", label: "3D · Spherical divergence" },
    { value: "abc", label: "3D · ABC flow (chaotic)" },
];

const COLOR_OPTIONS = [
    { value: "orange", label: "Orange" },
    { value: "blue", label: "Blue" },
    { value: "cyan", label: "Cyan" },
    { value: "green", label: "Green" },
    { value: "white", label: "White" },
];

export function Settings(): React.ReactNode {
    const [datasetType, setDatasetType] = useAtom(datasetTypeAtom);
    const [numParticles, setNumParticles] = useAtom(numParticlesAtom);
    const [maxAge, setMaxAge] = useAtom(maxAgeAtom);
    const [speedFactor, setSpeedFactor] = useAtom(speedFactorAtom);
    const [opacity, setOpacity] = useAtom(opacityAtom);
    const [lineWidth, setLineWidth] = useAtom(lineWidthAtom);
    const [trailSteps, setTrailSteps] = useAtom(trailStepsAtom);
    const [trailLength, setTrailLength] = useAtom(trailLengthAtom);
    const [colorPreset, setColorPreset] = useAtom(colorPresetAtom);

    return (
        <div className="flex flex-col gap-4 p-2">
            <Label text="Dataset">
                <Dropdown
                    value={datasetType}
                    options={DATASET_OPTIONS}
                    onChange={(val) => setDatasetType(val as DatasetType)}
                />
            </Label>

            <Label text="Color">
                <Dropdown
                    value={colorPreset}
                    options={COLOR_OPTIONS}
                    onChange={(val) => setColorPreset(val as ColorPreset)}
                />
            </Label>

            <Label text={`Particles: ${numParticles}`}>
                <Slider
                    value={numParticles}
                    min={10}
                    max={1000}
                    step={10}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setNumParticles(val as number)}
                />
            </Label>

            <Label text={`Max age: ${maxAge.toFixed(1)} s`}>
                <Slider
                    value={maxAge}
                    min={0.5}
                    max={8}
                    step={0.5}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setMaxAge(val as number)}
                />
            </Label>

            <Label text={`Speed factor: ${speedFactor.toFixed(1)}x`}>
                <Slider
                    value={speedFactor}
                    min={0.1}
                    max={20}
                    step={0.5}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setSpeedFactor(val as number)}
                />
            </Label>

            <Label text={`Opacity: ${opacity.toFixed(2)}`}>
                <Slider
                    value={opacity}
                    min={0}
                    max={1}
                    step={0.05}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setOpacity(val as number)}
                />
            </Label>

            <Label text={`Line width: ${lineWidth} px`}>
                <Slider
                    value={lineWidth}
                    min={1}
                    max={6}
                    step={0.5}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setLineWidth(val as number)}
                />
            </Label>

            <Label text={`Trail steps: ${trailSteps}`}>
                <Slider
                    value={trailSteps}
                    min={3}
                    max={24}
                    step={1}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setTrailSteps(val as number)}
                />
            </Label>

            <Label text={`Trail length: ${(trailLength * 100).toFixed(0)}%`}>
                <Slider
                    value={trailLength}
                    min={0.03}
                    max={0.5}
                    step={0.01}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setTrailLength(val as number)}
                />
            </Label>
        </div>
    );
}
