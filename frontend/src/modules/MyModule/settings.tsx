import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { Button } from "@lib/components/Button";
import { ColorGradient } from "@lib/components/ColorGradient/colorGradient";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select } from "@lib/components/Select";
import { ColorScaleGradientType, ColorScaleType } from "@lib/utils/ColorScale";

import { useAtom, useAtomValue } from "jotai";

import { availableOptionsAtom, fixedUpOptionAtom, gradientTypeAtom, userSelectedOptionAtom } from "./atoms";
import { ModuleSerializedState } from "./persistence";
import { State } from "./state";

export const Settings = (
    props: ModuleSettingsProps<
        State,
        { baseStates: Record<string, never>; derivedStates: Record<string, never> },
        Record<string, never>,
        Record<string, never>,
        ModuleSerializedState
    >
) => {
    const [type, setType] = props.settingsContext.useStoreState("type");
    const [gradientType, setGradientType] = useAtom(gradientTypeAtom);
    const [userSelectedOption, setOption] = useAtom(userSelectedOptionAtom);
    const option = useAtomValue(fixedUpOptionAtom);
    const [simulatedOptions, setSimulatedOptions] = useAtom(availableOptionsAtom);
    const [min, setMin] = props.settingsContext.useStoreState("min");
    const [max, setMax] = props.settingsContext.useStoreState("max");
    const [divMidPoint, setDivMidPoint] = props.settingsContext.useStoreState("divMidPoint");

    function handleTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setType(e.target.value as ColorScaleType);
    }

    function handleGradientTypeChange(e: React.ChangeEvent<HTMLInputElement>) {
        setGradientType(e.target.value as ColorScaleGradientType);
    }

    function handleSelectChange(value: string[]) {
        setOption(value[0]);
    }

    function changeSimulatedOptions() {
        setSimulatedOptions(["option4", "option5"]);
    }

    function resetSimulatedOptions() {
        setSimulatedOptions(["option1", "option2", "option3"]);
    }

    const colorScale =
        type === ColorScaleType.Continuous
            ? props.workbenchSettings.useContinuousColorScale({
                  gradientType: gradientType.value,
              })
            : props.workbenchSettings.useDiscreteColorScale({
                  gradientType: gradientType.value,
              });

    const optionsArr = simulatedOptions.map((option) => ({ value: option, label: option }));

    const invalidPersistedValue =
        userSelectedOption.isPersistedValue && option !== userSelectedOption.value && simulatedOptions.length > 0;

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
                    value={gradientType.value}
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
            {gradientType.value === ColorScaleGradientType.Diverging && (
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
            <Select
                options={optionsArr}
                size={4}
                value={invalidPersistedValue ? [] : [option]}
                onChange={handleSelectChange}
                invalid={invalidPersistedValue}
                invalidMessage="Persisted value is not valid. Please select a valid option."
            />
            <Button onClick={changeSimulatedOptions}>Change simulated options</Button>
            <Button onClick={resetSimulatedOptions}>Reset simulated options</Button>
        </div>
    );
};
