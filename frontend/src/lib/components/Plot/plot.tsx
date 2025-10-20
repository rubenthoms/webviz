import React from "react";
import * as echarts from "echarts";

export type PlotProps = {
    width?: number;
    height?: number;
};

export function Plot(props: PlotProps) {
    const divRef = React.useRef<HTMLDivElement>(null);
    const chartRef = React.useRef<echarts.ECharts | null>(null);

    React.useEffect(function onMount() {
        if (!divRef.current) {
            return;
        }

        chartRef.current = echarts.init(divRef.current);

        chartRef.current.setOption({
            xAxis: {
                type: "category",
                data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            },
            yAxis: {
                type: "value",
            },
            series: [
                {
                    data: [150, 230, 224, 218, 135, 147, 260],
                    type: "line",
                },
            ],
        });

        return function onUnmount() {
            chartRef.current?.dispose();
            chartRef.current = null;
        };
    }, []);

    return <div ref={divRef} style={{ width: props.width, height: props.height }} />;
}
