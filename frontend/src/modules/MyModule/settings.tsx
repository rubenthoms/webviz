import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { State } from "./state";

export const settings = (props: ModuleSettingsProps<State>) => {
    const [type, setType] = props.settingsContext.useStoreState("type");
    const [gradientType, setGradientType] = props.settingsContext.useStoreState("gradientType");
    const [min, setMin] = props.settingsContext.useStoreState("min");
    const [max, setMax] = props.settingsContext.useStoreState("max");
    const [divMidPoint, setDivMidPoint] = props.settingsContext.useStoreState("divMidPoint");

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
                <Input type="number" value={min} onChange={(e) => setMin(parseFloat(e.target.value))} />
            </Label>
            <Label text="Max">
                <Input type="number" value={max} onChange={(e) => setMax(parseFloat(e.target.value))} />
            </Label>
            {gradientType === ColorScaleGradientType.Diverging && (
                <Label text="Midpoint">
                    <Input
                        type="number"
                        value={divMidPoint}
                        onChange={(e) => setDivMidPoint(parseFloat(e.target.value))}
                        min={0}
                        max={max}
                    />
                </Label>
            )}
        </div>
    );
};
