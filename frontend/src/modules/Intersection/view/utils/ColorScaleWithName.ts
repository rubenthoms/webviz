import { ColorScale, ColorScaleOptions } from "@lib/utils/ColorScale";

export class ColorScaleWithName extends ColorScale {
    private _name: string;

    constructor(options: ColorScaleOptions & { name: string }) {
        super(options);
        this._name = options.name;
    }

    setName(name: string) {
        this._name = name;
    }

    getName() {
        return this._name;
    }

    static fromColorScale(colorScale: ColorScale, name: string): ColorScaleWithName {
        return new ColorScaleWithName({
            type: colorScale.getType(),
            colorPalette: colorScale.getColorPalette(),
            gradientType: colorScale.getGradientType(),
            steps: colorScale.getNumSteps(),
            name,
        });
    }

    override clone(): ColorScaleWithName {
        return new ColorScaleWithName({
            type: this.getType(),
            colorPalette: this.getColorPalette(),
            gradientType: this.getGradientType(),
            steps: this.getNumSteps(),
            name: this._name,
        });
    }
}
