import React from "react";

import { ColorPaletteType, WorkbenchSettings } from "@framework/WorkbenchSettings";
import { Checkbox } from "@lib/components/Checkbox";
import { ColorGradient } from "@lib/components/ColorGradient";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { isEqual } from "lodash";

export type ColorScaleSelectorProps = {
    workbenchSettings: WorkbenchSettings;
    colorScale?: ColorScale;
    onChange: (colorScale: ColorScale) => void;
};

export function ColorScaleSelector(props: ColorScaleSelectorProps): React.ReactNode {
    const [colorScale, setColorScale] = React.useState<ColorScale>(
        props.workbenchSettings.useContinuousColorScale({ gradientType: ColorScaleGradientType.Sequential })
    );

    const [prevColorScale, setPrevColorScale] = React.useState<ColorScale | undefined>(undefined);

    if (!isEqual(props.colorScale, prevColorScale)) {
        setPrevColorScale(props.colorScale);
        if (props.colorScale) {
            setColorScale(props.colorScale);
        }
    }

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newType = e.target.value as ColorScaleType;
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            newType,
            colorScale.getGradientType(),
            colorScale.getMin(),
            colorScale.getMax()
        );
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newGradientType = e.target.value as ColorScaleGradientType;
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            colorScale.getType(),
            newGradientType,
            colorScale.getMin(),
            colorScale.getMax()
        );
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        makeAndPropagateColorScale(
            colorPalette,
            colorScale.getType(),
            colorScale.getGradientType(),
            colorScale.getMin(),
            colorScale.getMax()
        );
    }

    function setMin(min: number) {
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            colorScale.getType(),
            colorScale.getGradientType(),
            min,
            colorScale.getMax()
        );
    }

    function setMax(max: number) {
        makeAndPropagateColorScale(
            colorScale.getColorPalette(),
            colorScale.getType(),
            colorScale.getGradientType(),
            colorScale.getMin(),
            max
        );
    }

    function makeAndPropagateColorScale(
        colorPalette: ColorPalette,
        type: ColorScaleType,
        gradientType: ColorScaleGradientType,
        min: number,
        max: number
    ) {
        const colorScale = new ColorScale({
            colorPalette,
            type,
            gradientType,
            steps: 10,
        });
        colorScale.setRange(min, max);
        setColorScale(colorScale);
        props.onChange(colorScale);
    }

    return (
        <div className="flex flex-col gap-4">
            <Label text="Type">
                <RadioGroup
                    value={colorScale.getType()}
                    onChange={handleTypeChange}
                    options={[
                        {
                            value: ColorScaleType.Discrete,
                            label: (
                                <div className="flex gap-4 items-center">
                                    <div className="flex-grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} steps={10} />
                                    </div>
                                    <div>Discrete</div>
                                </div>
                            ),
                        },
                        {
                            value: ColorScaleType.Continuous,
                            label: (
                                <div className="flex gap-4 items-center h-4">
                                    <div className="flex-grow w-24">
                                        <ColorGradient colorPalette={colorScale.getColorPalette()} />
                                    </div>
                                    <div>Continuous</div>
                                </div>
                            ),
                        },
                    ]}
                />
            </Label>
            <Label text="Gradient type">
                <RadioGroup
                    value={colorScale.getGradientType()}
                    onChange={handleGradientTypeChange}
                    options={[
                        {
                            value: ColorScaleGradientType.Sequential,
                            label: "Sequential",
                        },
                        {
                            value: ColorScaleGradientType.Diverging,
                            label: "Diverging",
                        },
                    ]}
                    direction="horizontal"
                />
            </Label>
            <Label text="Color palette">
                <ColorPaletteSelector
                    type={getColorPaletteSelectorTypeFromColorScale(colorScale)}
                    colorPalettes={props.workbenchSettings.getColorPalettes()[getPaletteTypeFromColorScale(colorScale)]}
                    selectedColorPaletteId={colorScale.getColorPalette().getId()}
                    onChange={handleColorPaletteChange}
                />
            </Label>
            <Checkbox
                label="Min"
                checked={colorScale.getMin() === -1}
                onChange={(e) => setMin(e.target.checked ? -1 : 0)}
            />
            <Input
                type="number"
                min={-1}
                max={10}
                value={colorScale.getMin()}
                onChange={(e) => setMin(parseFloat(e.target.value))}
            />
            <Label text="Max">
                <Input type="number" value={colorScale.getMax()} onChange={(e) => setMax(parseFloat(e.target.value))} />
            </Label>
        </div>
    );
}

function getPaletteTypeFromColorScale(colorScale: ColorScale): ColorPaletteType {
    if (colorScale.getGradientType() === ColorScaleGradientType.Sequential) {
        return ColorPaletteType.ContinuousSequential;
    }
    return ColorPaletteType.ContinuousDiverging;
}

function getColorPaletteSelectorTypeFromColorScale(colorScale: ColorScale): ColorPaletteSelectorType {
    if (colorScale.getType() === ColorScaleType.Continuous) {
        return ColorPaletteSelectorType.Continuous;
    }
    return ColorPaletteSelectorType.Discrete;
}
