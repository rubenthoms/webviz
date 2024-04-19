import React from "react";

import { Checkbox } from "@lib/components/Checkbox";
import { Input } from "@lib/components/Input";
import { Slider } from "@lib/components/Slider";

export type GridCellIndexFilterProps = {
    labelTitle: string;
    pickSingle: boolean;
    range: [number, number];
    max: number;
    onPickSingleChange: (pickSingle: boolean) => void;
    onChange: (range: [number, number]) => void;
};

export function GridCellIndexFilter(props: GridCellIndexFilterProps): React.ReactNode {
    function handleSliderChange(_: any, value: number[] | number) {
        if (typeof value === "number") {
            return;
        }
        if (!props.pickSingle) {
            props.onChange(value as [number, number]);
            return;
        }
        if (value[0] !== props.range[0]) {
            props.onChange([value[0], value[0]]);
            return;
        }

        props.onChange([value[1], value[1]]);
    }

    function handleRangeMinChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange([parseInt(e.target.value), props.range[1]]);
    }

    function handleRangeMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
        props.onChange([props.range[0], parseInt(e.target.value)]);
    }

    function handlePickSingleChange(_: React.ChangeEvent<HTMLInputElement>, checked: boolean) {
        props.onPickSingleChange(checked);
        props.onChange([props.range[0], props.range[0]]);
    }

    return (
        <div className="flex flex-col gap-2 text-sm">
            <div className="flex gap-2 items-center">
                <span className="flex-grow font-bold">{props.labelTitle}</span>
                <Checkbox checked={props.pickSingle} onChange={handlePickSingleChange} label="Use single" />
            </div>
            <div className="flex gap-1">
                <Input type="number" value={props.range[0]} onChange={handleRangeMinChange} className="w-12" />
                <div className="flex-grow">
                    <Slider
                        min={0}
                        max={props.max}
                        step={1}
                        value={props.range}
                        valueLabelDisplay="auto"
                        onChange={handleSliderChange}
                        debounceTimeMs={500}
                    />
                </div>
                <Input
                    type="number"
                    value={props.range[1]}
                    onChange={handleRangeMaxChange}
                    disabled={props.pickSingle}
                    className="w-12"
                />
            </div>
        </div>
    );
}
