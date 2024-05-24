import { ColorScale, ColorScaleGradientType } from "@lib/utils/ColorScale";

import { ColorScaleWithName } from "../utils/ColorScaleWithName";

export type ColorLegendsContainerProps = {
    colorScales: ColorScaleWithName[];
    height: number;
};

export function ColorLegendsContainer(props: ColorLegendsContainerProps): React.ReactNode {
    const width = Math.max(5, Math.min(10, 100 / props.colorScales.length));
    const lineWidth = 6;
    const lineColor = "#555";
    const textGap = 6;
    const offset = 10;
    const legendGap = 4;
    const textWidth = 50;
    const nameWidth = 10;
    const minHeight = Math.min(60 + 2 * offset, props.height);

    const numRows = Math.min(Math.floor(props.height / minHeight), props.colorScales.length);
    const numCols = Math.ceil(props.colorScales.length / numRows);
    const height = Math.max(minHeight, props.height / numRows - (numRows - 1) * legendGap);

    const textStyle: React.CSSProperties = {
        fontSize: "11px",
        stroke: "#fff",
        paintOrder: "stroke",
        strokeWidth: "6px",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        fontWeight: 800,
    };

    function makeLegends(): React.ReactNode[] {
        const legends: React.ReactNode[] = [];
        let index = 0;
        for (let row = 0; row < numRows; row++) {
            for (let col = 0; col < numCols; col++) {
                if (index >= props.colorScales.length) {
                    break;
                }
                const colorScale = props.colorScales[index++];
                const top = row * (height + 2 * offset) + row * legendGap;
                const left = col * (width + legendGap + lineWidth + textGap + textWidth + nameWidth);

                const markers: React.ReactNode[] = [];
                markers.push(
                    <line
                        key="max-marker"
                        x1={left + width + nameWidth + textGap}
                        y1={top + offset}
                        x2={left + width + lineWidth + nameWidth + textGap}
                        y2={top + offset}
                        stroke={lineColor}
                        strokeWidth="1"
                    />
                );
                markers.push(
                    <text
                        key="max-text"
                        x={left + width + lineWidth + textGap + nameWidth + textGap}
                        y={top + offset + 3}
                        fontSize="10"
                        style={textStyle}
                    >
                        {formatLegendValue(colorScale.getMax())}
                    </text>
                );
                if (colorScale.getGradientType() === ColorScaleGradientType.Diverging) {
                    const y =
                        1 -
                        (colorScale.getDivMidPoint() - colorScale.getMin()) /
                            (colorScale.getMax() - colorScale.getMin());
                    markers.push(
                        <line
                            key="mid-marker"
                            x1={left + width + nameWidth + textGap}
                            y1={top + y * height + offset}
                            x2={left + width + lineWidth + nameWidth + textGap}
                            y2={top + y * height + offset}
                            stroke={lineColor}
                            strokeWidth="2"
                        />
                    );
                    markers.push(
                        <text
                            key="mid-text"
                            x={left + width + lineWidth + textGap + nameWidth + textGap}
                            y={top + y * height + offset + 3}
                            fontSize="10"
                            style={textStyle}
                        >
                            {formatLegendValue(colorScale.getDivMidPoint())}
                        </text>
                    );
                } else {
                    const y = 0.5;
                    const value = colorScale.getMin() + (colorScale.getMax() - colorScale.getMin()) * y;
                    markers.push(
                        <line
                            key="mid-marker"
                            x1={left + width + nameWidth + textGap}
                            y1={top + y * height + offset}
                            x2={left + width + lineWidth + nameWidth + textGap}
                            y2={top + y * height + offset}
                            stroke={lineColor}
                            strokeWidth="1"
                        />
                    );
                    markers.push(
                        <text
                            key="mid-text"
                            x={left + width + lineWidth + textGap + nameWidth + textGap}
                            y={top + y * height + offset + 3}
                            fontSize="10"
                            style={textStyle}
                        >
                            {formatLegendValue(value)}
                        </text>
                    );
                }

                markers.push(
                    <line
                        key="min-marker"
                        x1={left + width + nameWidth + textGap}
                        y1={top + height + offset}
                        x2={left + width + lineWidth + nameWidth + textGap}
                        y2={top + height + offset}
                        stroke={lineColor}
                        strokeWidth="1"
                    />
                );
                markers.push(
                    <text
                        key="min-text"
                        x={left + width + lineWidth + textGap + nameWidth + textGap}
                        y={top + height + offset + 3}
                        fontSize="10"
                        style={textStyle}
                    >
                        {formatLegendValue(colorScale.getMin())}
                    </text>
                );

                legends.push(
                    <g key={`color-scale-${colorScale.getColorPalette().getId()}`}>
                        <rect
                            key={index}
                            x={left + nameWidth + textGap}
                            y={top + offset}
                            width={width}
                            rx="4"
                            height={height}
                            fill={`url(#color-legend-gradient-${colorScale.getColorPalette().getId()})`}
                            stroke="#555"
                        />
                        <text
                            x={left}
                            y={top + offset + height / 2 + 6}
                            width={height}
                            height={10}
                            fontSize="10"
                            textAnchor="middle"
                            dominantBaseline="central"
                            alignmentBaseline="baseline"
                            transform={`rotate(270, ${left}, ${top + offset + height / 2})`}
                            style={textStyle}
                        >
                            {colorScale.getName()}
                        </text>
                        {markers}
                    </g>
                );
            }
        }
        return legends;
    }

    return (
        <div className="absolute bottom-8 left-0 flex gap-2 z-50">
            <svg
                style={{
                    height: numRows * (height + 2 * offset) + (numRows - 1) * legendGap,
                    width: numCols * (width + legendGap + lineWidth + textGap + textWidth),
                }}
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    {props.colorScales.map((colorScale, index) => (
                        <GradientDef key={index} colorScale={colorScale} />
                    ))}
                </defs>
                {makeLegends()}
            </svg>
        </div>
    );
}

type GradientDefProps = {
    colorScale: ColorScale;
};

function GradientDef(props: GradientDefProps): React.ReactNode {
    const colorStops = props.colorScale.getColorStops();
    const gradientId = `color-legend-gradient-${props.colorScale.getColorPalette().getId()}`;

    return (
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            {colorStops.toReversed().map((colorStop, index) => (
                <stop
                    key={index}
                    offset={`${((1 - colorStop.offset) * 100).toFixed(2)}%`}
                    stopColor={colorStop.color}
                />
            ))}
        </linearGradient>
    );
}

function countDecimalPlaces(value: number): number {
    const decimalIndex = value.toString().indexOf(".");
    return decimalIndex >= 0 ? value.toString().length - decimalIndex - 1 : 0;
}

function formatLegendValue(value: number): string {
    const numDecimalPlaces = countDecimalPlaces(value);
    if (Math.log10(Math.abs(value)) > 2) {
        return value.toExponential(numDecimalPlaces > 2 ? 2 : numDecimalPlaces);
    }
    return value.toFixed(numDecimalPlaces > 2 ? 2 : numDecimalPlaces);
}
