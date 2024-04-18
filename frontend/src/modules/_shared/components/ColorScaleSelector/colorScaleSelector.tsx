import React from "react";

import { ColorPaletteType, WorkbenchSettings } from "@framework/WorkbenchSettings";
import { ColorGradient } from "@lib/components/ColorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorScale, ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

export type ColorScaleSelectorProps = {
    workbenchSettings: WorkbenchSettings;
    colorScale?: ColorScale;
    range?: [number, number];
    onChange: (colorScale: ColorScale, range: [number, number]) => void;
};

export function ColorScaleSelector(props: ColorScaleSelectorProps): React.ReactNode {
    const [colorPalette, setColorPalette] = React.useState<ColorPalette>(
        props.workbenchSettings.getColorPalettes()[ColorPaletteType.ContinuousSequential][0]
    );
    const [type, setType] = React.useState<ColorScaleType>(ColorScaleType.Continuous);
    const [gradientType, setGradientType] = React.useState<ColorScaleGradientType>(ColorScaleGradientType.Sequential);
    const [min, setMin] = React.useState<number>(0);
    const [max, setMax] = React.useState<number>(0);

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(e.target.value as ColorScaleType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(e.target.value as ColorScaleGradientType);
    }

    const colorScale =
        type === ColorScaleType.Continuous
            ? props.workbenchSettings.useContinuousColorScale({
                  gradientType,
              })
            : props.workbenchSettings.useDiscreteColorScale({
                  gradientType,
              });

    return (
        <div className="flex flex-col gap-4">
            <Label text="Type">
                <RadioGroup
                    value={type}
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
                    value={gradientType}
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
            <Label text="Min">
                <Input
                    type="number"
                    min={-1}
                    max={10}
                    value={min}
                    onChange={(e) => setMin(parseFloat(e.target.value))}
                />
            </Label>
            <Label text="Max">
                <Input type="number" value={max} onChange={(e) => setMax(parseFloat(e.target.value))} />
            </Label>
        </div>
    );
}
