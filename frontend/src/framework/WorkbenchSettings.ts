import React from "react";

import { CategoricalColor, CategoricalColorPalette, ContinuousColorPalette } from "@lib/utils/ColorPalette";

import { ColorType, Workbench, WorkbenchEvents } from "./Workbench";

export enum ColorScaleType {
    Sequential,
    Diverging,
}

export enum ColorScaleScaleType {
    Linear,
    Logarithmic,
    Exponential,
}

export class ColorScale {
    private _colorPalette: ContinuousColorPalette;
    private _min: number;
    private _max: number;
    private _type: ColorScaleType;
    private _scaleType: ColorScaleScaleType;
    private _divMidPoint: number;

    constructor(
        colorPalette: ContinuousColorPalette,
        type: ColorScaleType,
        scaleType: ColorScaleScaleType,
        divMidPoint?: number
    ) {
        this._colorPalette = colorPalette;
        this._min = 0;
        this._max = 1;
        this._type = type;
        this._scaleType = scaleType;
        this._divMidPoint = divMidPoint || 0;
    }

    getColorForValue(value: number): string {
        let normalizedValue = 0;
        if (this._type === ColorScaleType.Sequential) {
            switch (this._scaleType) {
                case ColorScaleScaleType.Linear:
                    normalizedValue = (value - this._min) / (this._max - this._min);
                    break;
                case ColorScaleScaleType.Logarithmic:
                    normalizedValue = Math.log10(value - this._min) / Math.log10(this._max - this._min);
                    break;
                case ColorScaleScaleType.Exponential:
                    normalizedValue = Math.pow(value - this._min, 2) / Math.pow(this._max - this._min, 2);
                    break;
            }
        } else if (this._type === ColorScaleType.Diverging) {
            switch (this._scaleType) {
                case ColorScaleScaleType.Linear:
                    if (value < this._divMidPoint) {
                        normalizedValue = ((value - this._min) / (this._divMidPoint - this._min)) * 0.5;
                    } else {
                        normalizedValue = 0.5 * (1 + (value - this._divMidPoint) / (this._max - this._divMidPoint));
                    }
                    break;
                case ColorScaleScaleType.Logarithmic:
                    if (value < this._divMidPoint) {
                        normalizedValue =
                            (Math.log10(value - this._min) / Math.log10(this._divMidPoint - this._min)) * 0.5;
                    } else {
                        normalizedValue =
                            0.5 *
                            (1 + Math.log10(value - this._divMidPoint) / Math.log10(this._max - this._divMidPoint));
                    }
                    break;
                case ColorScaleScaleType.Exponential:
                    if (value < this._divMidPoint) {
                        normalizedValue =
                            (Math.pow(value - this._min, 2) / Math.pow(this._divMidPoint - this._min, 2)) * 0.5;
                    } else {
                        normalizedValue =
                            0.5 *
                            (1 + Math.pow(value - this._divMidPoint, 2) / Math.pow(this._max - this._divMidPoint, 2));
                    }
                    break;
            }
        }

        const color = this._colorPalette.getColorAtPosition(normalizedValue);
        return color;
    }

    sampleColors(numSamples: number): string[] {
        const colors: string[] = [];
        for (let i = 0; i < numSamples; i++) {
            colors.push(this.getColorForValue((this._max - this._min) * (i / (numSamples - 1)) + this._min));
        }
        return colors;
    }

    getMin(): number {
        return this._min;
    }

    getMax(): number {
        return this._max;
    }

    setMin(value: number) {
        this._min = value;
    }

    setMax(value: number) {
        this._max = value;
    }

    setScaleType(scaleType: ColorScaleScaleType) {
        this._scaleType = scaleType;
    }

    cloneWithNewPalette(colorPalette: ContinuousColorPalette): ColorScale {
        const newScale = new ColorScale(colorPalette, this._type, this._scaleType);
        newScale._min = this._min;
        newScale._max = this._max;
        newScale._divMidPoint = this._divMidPoint;
        return newScale;
    }
}

export class ColorSet {
    private _colorPalette: CategoricalColorPalette;
    private _runningIndex: number;

    constructor(colorPalette: CategoricalColorPalette) {
        this._colorPalette = colorPalette;
        this._runningIndex = 0;
    }

    getColorArray(): string[] {
        return this._colorPalette.getColors().map((color: CategoricalColor) => color.hexColor);
    }

    getColor(index: number): string {
        if (index < 0 || index >= this._colorPalette.getColors().length) {
            throw new Error(`Color index ${index} is out of bounds`);
        }
        return this._colorPalette.getColors()[index].hexColor;
    }

    /**
     *
     * @returns The first color in the palette, and resets the running index to 0
     */
    getFirstColor(): string {
        this._runningIndex = Math.min(1, this._colorPalette.getColors().length - 1);
        return this._colorPalette.getColors()[0].hexColor;
    }

    /**
     *
     * @returns The next color in the palette, and increments the running index
     *
     * If the running index is at the end of the palette, it wraps around to the beginning
     *
     * If the palette is empty, it returns "#000000".
     *
     */
    getNextColor(): string {
        if (this._colorPalette.getColors().length === 0) {
            return "#000000";
        }
        const color = this._colorPalette.getColors()[this._runningIndex].hexColor;
        this._runningIndex = (this._runningIndex + 1) % this._colorPalette.getColors().length;
        return color;
    }
}

export class WorkbenchSettings {
    private _workbench: Workbench;

    constructor(workbench: Workbench) {
        this._workbench = workbench;
    }

    useColorSet(): ColorSet {
        const [colorSet, setColorSet] = React.useState<ColorSet>(
            new ColorSet(this._workbench.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette)
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorSet(
                    new ColorSet(
                        this._workbench.getSelectedColorPalette(ColorType.Categorical) as CategoricalColorPalette
                    )
                );
            };

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, []);

        return colorSet;
    }

    private _useColorScale(type: ColorScaleType, scaleType: ColorScaleScaleType, divMidPoint?: number): ColorScale {
        const [colorScale, setColorScale] = React.useState<ColorScale>(
            new ColorScale(
                this._workbench.getSelectedColorPalette(
                    type === ColorScaleType.Diverging ? ColorType.Diverging : ColorType.Sequential
                ) as ContinuousColorPalette,
                type,
                scaleType,
                divMidPoint
            )
        );

        React.useEffect(() => {
            // Explicitly using arrow function to preserve the "this" context
            const handleColorPalettesChanged = () => {
                setColorScale(
                    colorScale.cloneWithNewPalette(
                        this._workbench.getSelectedColorPalette(
                            type === ColorScaleType.Diverging ? ColorType.Diverging : ColorType.Sequential
                        ) as ContinuousColorPalette
                    )
                );
            };

            const unsubscribeFunc = this._workbench.subscribe(
                WorkbenchEvents.ColorPalettesChanged,
                handleColorPalettesChanged
            );

            return () => {
                unsubscribeFunc();
            };
        }, [colorScale]);

        return colorScale;
    }

    useSequentialColorScale(options?: { scaleType: ColorScaleScaleType }): ColorScale {
        return this._useColorScale(ColorScaleType.Sequential, options?.scaleType ?? ColorScaleScaleType.Linear);
    }

    useDivergingColorScale(options?: { divMidPoint?: number; scaleType?: ColorScaleScaleType }): ColorScale {
        return this._useColorScale(
            ColorScaleType.Diverging,
            options?.scaleType ?? ColorScaleScaleType.Linear,
            options?.divMidPoint
        );
    }
}