import React from "react";
import Plot from "react-plotly.js";

import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { Layout, PlotData } from "plotly.js";

import { State } from "./state";

const strategies = ["Default", "TypedArray", "Done"];
const maxNumCurves = 100;
const maxRepetitions = 30;

export const view = (props: ModuleFCProps<State>) => {
    const [numCurves, setNumCurves] = React.useState(1);
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const results = React.useRef<{ strategy: string; numCurves: number; accTimems: number }[]>([]);
    const [reps, setReps] = React.useState(0);
    const [strategy, setStrategy] = React.useState<string>(strategies[0]);

    const xArray: Float32Array = new Float32Array(
        Array(101)
            .fill(0)
            .map((_, i) => i - 50)
    );
    const dataPointsTypedArray: Float32Array[] = [];
    const dataPointsArray: number[][] = [];

    for (let i = 0; i < numCurves; i++) {
        const dataPoints: number[] = [];
        for (let x = -50; x <= 50; x++) {
            dataPoints.push(x + i);
        }
        dataPointsTypedArray.push(new Float32Array(dataPoints));
        dataPointsArray.push(dataPoints);
    }

    const layout: Partial<Layout> = {
        width: wrapperDivSize.width,
        height: wrapperDivSize.height,
        title: "Benchmark",
        margin: { t: 30, r: 0, l: 40, b: 40 },
    };

    const typedArrayData: Partial<PlotData>[] = dataPointsTypedArray.map((dataPoints, i) => ({
        x: xArray,
        y: dataPoints,
        type: "scatter",
        mode: "lines",
        name: `Curve ${i + 1}`,
    }));

    const arrayData: Partial<PlotData>[] = dataPointsArray.map((dataPoints, i) => ({
        x: xArray,
        y: dataPoints,
        type: "scatter",
        mode: "lines",
        name: `Curve ${i + 1}`,
    }));

    function handleBenchmarkDone(strategy: string, numCurves: number, timems: number) {
        const existingEntry = results.current.find(
            (result) => result.strategy === strategy && result.numCurves === numCurves
        );
        if (existingEntry) {
            existingEntry.accTimems += timems;
        } else {
            results.current.push({ strategy, numCurves, accTimems: timems });
        }
        if (reps === maxRepetitions) {
            if (numCurves < maxNumCurves) {
                setNumCurves((prev) => prev + 1);
            } else {
                setNumCurves(1);
                setStrategy(strategies[(strategies.indexOf(strategy) + 1) % strategies.length]);
            }
            setReps(0);
        } else {
            setReps((prev) => prev + 1);
        }
    }

    if (strategy === "Done") {
        const releventStrategies = strategies.slice(0, strategies.indexOf("Done"));
        const data: Partial<PlotData>[] = releventStrategies.map((strat) => ({
            x: results.current.filter((result) => result.strategy === strat).map((result) => result.numCurves),
            y: results.current
                .filter((result) => result.strategy === strat)
                .map((result) => result.accTimems / maxRepetitions),
            type: "scatter",
            mode: "lines",
            name: strat,
        }));
        return (
            <div ref={wrapperDivRef} className="w-full h-full">
                <Plot data={data} layout={layout} />
            </div>
        );
    }

    return (
        <div ref={wrapperDivRef} className="w-full h-full">
            <PlotlyBenchmark
                data={strategy === "TypedArray" ? typedArrayData : arrayData}
                layout={layout}
                numCurves={numCurves}
                strategy={strategy}
                onBenchmarkDone={handleBenchmarkDone}
            />
        </div>
    );
};

type PlotlyBenchmarkProps = {
    numCurves: number;
    data: Partial<PlotData>[];
    layout: Partial<Layout>;
    strategy: string;
    onBenchmarkDone: (strategy: string, numCurves: number, timems: number) => void;
};

const PlotlyBenchmark: React.FC<PlotlyBenchmarkProps> = (props) => {
    const timestampRef = React.useRef<number>(0);

    function handleAfterPlot() {
        props.onBenchmarkDone(props.strategy, props.numCurves, Date.now() - timestampRef.current);
    }

    timestampRef.current = Date.now();

    return <Plot data={props.data} layout={props.layout} onAfterPlot={handleAfterPlot} />;
};
