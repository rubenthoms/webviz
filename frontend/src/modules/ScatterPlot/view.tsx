import React from "react";

import { broadcaster } from "@framework/Broadcaster";
import { ModuleFCProps } from "@framework/Module";
import { useElementSize } from "@lib/hooks/useElementSize";

import { ThreeDScatter } from "./3dscatterplot";
import { Barchart } from "./barchart";
import { Histogram } from "./histogram";
import PlotlyScatter from "./plotlyScatterChart";
import { State } from "./state";

function nFormatter(num: number, digits: number): string {
    const lookup = [
        { value: 1, symbol: "" },
        { value: 1e3, symbol: "k" },
        { value: 1e6, symbol: "M" },
        { value: 1e9, symbol: "B" },
        { value: 1e12, symbol: "T" },
        { value: 1e15, symbol: "P" },
        { value: 1e18, symbol: "E" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    const item = lookup
        .slice()
        .reverse()
        .find(function (item) {
            return num >= item.value;
        });
    return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}

export const view = ({ moduleContext }: ModuleFCProps<State>) => {
    const wrapperDivRef = React.useRef<HTMLDivElement>(null);
    const wrapperDivSize = useElementSize(wrapperDivRef);
    const plotType = moduleContext.useStoreValue("plotType");
    const channelNameX = moduleContext.useStoreValue("channelNameX");
    const channelNameY = moduleContext.useStoreValue("channelNameY");
    const channelNameZ = moduleContext.useStoreValue("channelNameZ");
    const [dataX, setDataX] = React.useState<any[] | null>(null);
    const [dataY, setDataY] = React.useState<any[] | null>(null);
    const [dataZ, setDataZ] = React.useState<any[] | null>(null);
    const [xTitle, setXTitle] = React.useState<string>("");
    const [yTitle, setYTitle] = React.useState<string>("");
    const [zTitle, setZTitle] = React.useState<string>("");

    const channelX = broadcaster.getChannel(channelNameX ?? "");
    const channelY = broadcaster.getChannel(channelNameY ?? "");
    const channelZ = broadcaster.getChannel(channelNameZ ?? "");

    React.useEffect(() => {
        if (channelX) {
            const handleChannelXChanged = (data: any, description: string) => {
                setDataX(data);
                setXTitle(description);
            };

            const unsubscribeFunc = channelX.subscribe(handleChannelXChanged);

            return unsubscribeFunc;
        }
    }, [channelX]);

    React.useEffect(() => {
        if (channelY) {
            const handleChannelYChanged = (data: any, description: string) => {
                setDataY(data);
                setYTitle(description);
            };

            const unsubscribeFunc = channelY.subscribe(handleChannelYChanged);

            return unsubscribeFunc;
        }
    }, [channelY]);

    React.useEffect(() => {
        if (channelZ) {
            const handleChannelZChanged = (data: any, description: string) => {
                setDataZ(data);
                setZTitle(description);
            };

            const unsubscribeFunc = channelZ.subscribe(handleChannelZChanged);

            return unsubscribeFunc;
        }
    }, [channelZ]);

    const makeContent = (): React.ReactNode => {
        if (plotType === null) {
            return "Please select a plot type.";
        }

        if (plotType === "histogram") {
            if (dataX === null) {
                return "Please select a channel for the x-axis.";
            }

            const numBins = 10;
            const xValues = dataX.map((el: any) => el.value);
            const xMin = Math.min(...xValues);
            const xMax = Math.max(...xValues);
            const binSize = (xMax - xMin) / numBins;
            const bins: { from: number; to: number }[] = Array.from({ length: numBins }, (_, i) => ({
                from: xMin + i * binSize,
                to: xMin + (i + 1) * binSize,
            }));
            bins[bins.length - 1].to = xMax + 1e-6; // make sure the last bin includes the max value
            const binValues: number[] = bins.map(
                (range) => xValues.filter((el) => el >= range.from && el < range.to).length
            );

            const binStrings = bins.map((range) => `${nFormatter(range.from, 2)}-${nFormatter(range.to, 2)}`);

            return (
                <Histogram
                    x={binStrings}
                    y={binValues}
                    xAxisTitle={xTitle}
                    yAxisTitle={channelX?.getDataDef().key || ""}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            );
        }

        if (plotType === "barchart") {
            if (dataX === null) {
                return "Please select a channel for the x-axis.";
            }

            return (
                <Barchart
                    x={dataX.map((el: any) => el.value)}
                    y={dataX.map((el: any) => el.key)}
                    xAxisTitle={xTitle}
                    yAxisTitle={channelX?.getDataDef().key || ""}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                    orientation="h"
                />
            );
        }

        if (plotType === "scatter") {
            if (!dataX || !dataY) {
                return "Please select a channel for the x-axis and the y-axis.";
            }

            const xValues: number[] = [];
            const yValues: number[] = [];

            const keysX = dataX.map((el: any) => el.key);
            const keysY = dataY.map((el: any) => el.key);
            if (keysX.length === keysY.length && !keysX.some((el, index) => el !== keysY[index])) {
                keysX.forEach((key) => {
                    const dataPointX = dataX.find((el: any) => el.key === key);
                    const dataPointY = dataY.find((el: any) => el.key === key);
                    xValues.push(dataPointX.value);
                    yValues.push(dataPointY.value);
                });
            }

            return (
                <PlotlyScatter
                    x={xValues}
                    y={yValues}
                    xAxisTitle={xTitle}
                    yAxisTitle={yTitle}
                    realizations={[]}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            );
        }

        if (plotType === "scatter3d") {
            if (!dataX || !dataY || !dataZ) {
                return "Please select a channel for the x-axis, the y-axis and the z-axis.";
            }

            const xValues: number[] = [];
            const yValues: number[] = [];
            const zValues: number[] = [];

            const keysX = dataX.map((el: any) => el.key);
            const keysY = dataY.map((el: any) => el.key);
            const keysZ = dataZ.map((el: any) => el.key);
            if (
                keysX.length === keysY.length &&
                keysY.length === keysZ.length &&
                !keysX.some((el, index) => el !== keysY[index]) &&
                !keysX.some((el, index) => el !== keysZ[index])
            ) {
                keysX.forEach((key) => {
                    const dataPointX = dataX.find((el: any) => el.key === key);
                    const dataPointY = dataY.find((el: any) => el.key === key);
                    const dataPointZ = dataZ.find((el: any) => el.key === key);
                    xValues.push(dataPointX.value);
                    yValues.push(dataPointY.value);
                    zValues.push(dataPointZ.value);
                });
            }

            return (
                <ThreeDScatter
                    x={xValues}
                    y={yValues}
                    z={zValues}
                    xAxisTitle={xTitle}
                    yAxisTitle={yTitle}
                    zAxisTitle={zTitle}
                    width={wrapperDivSize.width}
                    height={wrapperDivSize.height}
                />
            );
        }
    };

    return (
        <div className="w-full h-full" ref={wrapperDivRef}>
            {makeContent()}
        </div>
    );
};
