import type React from "react";

import { useAtom } from "jotai";

import { ColorScaleSelector } from "@framework/components/ColorScaleSelector/colorScaleSelector";
import type { ModuleSettingsProps } from "@framework/Module";
import { Dropdown } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { Slider } from "@lib/components/Slider";
import { Switch } from "@lib/components/Switch";

import type { ColorPreset, DatasetType } from "./atoms";
import {
    colorPresetAtom,
    colorScaleSpecificationAtom,
    datasetTypeAtom,
    lineWidthAtom,
    magnitudeOpacityAtom,
    maxAgeAtom,
    numParticlesAtom,
    opacityAtom,
    showMagnitudeOverlayAtom,
    speedFactorAtom,
    timeAtom,
    trailLengthAtom,
    trailStepsAtom,
} from "./atoms";
import type { Interfaces } from "./interfaces";

const DATASET_OPTIONS = [
    { value: "vortex", label: "2D · Vortex (uniform speed)" },
    { value: "spiral", label: "2D · Spiral (speed ∝ radius)" },
    { value: "saddle", label: "2D · Saddle point" },
    { value: "convergent", label: "2D · Convergent (speed ∝ radius)" },
    { value: "helix", label: "3D · Helix (time = pitch wave)" },
    { value: "sphere", label: "3D · Spherical divergence" },
    { value: "abc", label: "3D · ABC flow (time = phase morph)" },
    { value: "wave", label: "3D · Traveling wave (time = phase)" },
    { value: "lorenz", label: "3D · Lorenz attractor flow" },
    { value: "tornado", label: "3D · Tornado (time = precession)" },
];

const COLOR_OPTIONS = [
    { value: "orange", label: "Orange" },
    { value: "blue", label: "Blue" },
    { value: "cyan", label: "Cyan" },
    { value: "green", label: "Green" },
    { value: "white", label: "White" },
];

export function Settings({ workbenchSettings }: ModuleSettingsProps<Interfaces>): React.ReactNode {
    const [datasetType, setDatasetType] = useAtom(datasetTypeAtom);
    const [numParticles, setNumParticles] = useAtom(numParticlesAtom);
    const [maxAge, setMaxAge] = useAtom(maxAgeAtom);
    const [speedFactor, setSpeedFactor] = useAtom(speedFactorAtom);
    const [opacity, setOpacity] = useAtom(opacityAtom);
    const [lineWidth, setLineWidth] = useAtom(lineWidthAtom);
    const [trailSteps, setTrailSteps] = useAtom(trailStepsAtom);
    const [trailLength, setTrailLength] = useAtom(trailLengthAtom);
    const [colorPreset, setColorPreset] = useAtom(colorPresetAtom);
    const [time, setTime] = useAtom(timeAtom);
    const [showMagnitudeOverlay, setShowMagnitudeOverlay] = useAtom(showMagnitudeOverlayAtom);
    const [magnitudeOpacity, setMagnitudeOpacity] = useAtom(magnitudeOpacityAtom);
    const [colorScaleSpecification, setColorScaleSpecification] = useAtom(colorScaleSpecificationAtom);

    return (
        <div className="flex flex-col gap-4 p-2">
            <Label text="Dataset">
                <Dropdown
                    value={datasetType}
                    options={DATASET_OPTIONS}
                    onChange={(val) => setDatasetType(val as DatasetType)}
                />
            </Label>

            <Label text={`Time phase: ${time.toFixed(2)}`}>
                <Slider
                    value={time}
                    min={0}
                    max={1}
                    step={0.01}
                    valueLabelDisplay="auto"
                    onChange={(_, val) => setTime(val as number)}
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

            <Label text="Show magnitude overlay" position="left">
                <Switch
                    checked={showMagnitudeOverlay}
                    onChange={(e) => setShowMagnitudeOverlay(e.target.checked)}
                />
            </Label>

            {showMagnitudeOverlay && (
                <>
                    <Label text={`Magnitude opacity: ${magnitudeOpacity.toFixed(2)}`}>
                        <Slider
                            value={magnitudeOpacity}
                            min={0}
                            max={1}
                            step={0.05}
                            valueLabelDisplay="auto"
                            onChange={(_, val) => setMagnitudeOpacity(val as number)}
                        />
                    </Label>

                    <Label text="Magnitude color scale">
                        <ColorScaleSelector
                            workbenchSettings={workbenchSettings}
                            colorScaleSpecification={colorScaleSpecification ?? undefined}
                            onChange={setColorScaleSpecification}
                        />
                    </Label>
                </>
            )}
        </div>
    );
}
