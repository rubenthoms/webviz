import React from "react";

import { cloneDeep, isEqual, set } from "lodash";
import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";

export type HighlightedCurve = {
    curveNumber: number;
    color: string;
};

export type Data =
    | Partial<Plotly.PlotData>
    | Partial<Plotly.BoxPlotData>
    | Partial<Plotly.ViolinData>
    | Partial<Plotly.OhlcData>
    | Partial<Plotly.CandlestickData>
    | Partial<Plotly.PieData>
    | Partial<Plotly.SankeyData>;

export type AdvancedPlotProps = {
    data: Data[];
    layout: Partial<Plotly.Layout>;
    config?: Partial<Plotly.Config>;
    frames?: Plotly.Frame[];

    highlightedCurves?: HighlightedCurve[];

    onHover?: (event: Plotly.PlotHoverEvent) => void;
    onUnhover?: () => void;

    onSelect?: (curveNumbers: number[]) => void;
    onDeselect?: () => void;

    height?: number;
    width?: number;
};

export const AdvancedPlot: React.FC<AdvancedPlotProps> = (props) => {
    const [isUnmounting, setIsUnmounting] = React.useState<boolean>(false);
    const [data, setData] = React.useState<Data[]>(props.data);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(props.layout);
    const [prevData, setPrevData] = React.useState<Data[]>(props.data);
    const [prevLayout, setPrevLayout] = React.useState<Partial<Plotly.Layout>>(props.layout);
    const [prevFrames, setPrevFrames] = React.useState<Plotly.Frame[] | undefined>(props.frames || undefined);
    const [prevHighlightedCurves, setPrevHighlightedCurves] = React.useState<HighlightedCurve[] | undefined>(undefined);

    const prevHighlightedCurvesRef = React.useRef<HighlightedCurve[]>([]);

    const divRef = React.useRef<HTMLDivElement>(null);
    const promiseRef = React.useRef<Promise<void>>(Promise.resolve());
    const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    let changes = false;

    if (props.data !== prevData) {
        changes = true;
        setData(props.data);
        setPrevData(props.data);
    }

    if (!isEqual(props.layout, prevLayout)) {
        changes = true;
        setLayout(props.layout);
        setPrevLayout(props.layout);
    }

    if (!isEqual(props.frames, prevFrames)) {
        changes = true;
        setPrevFrames(props.frames);
    }

    if (changes) {
        console.debug("update data");
        updatePlotly(props.data, props.layout, props.highlightedCurves, prevHighlightedCurvesRef.current);
    } else if (!isEqual(props.highlightedCurves, prevHighlightedCurves)) {
        console.debug("update highlighted curves");
        setPrevHighlightedCurves(cloneDeep(props.highlightedCurves));
        updateHighlightedCurves(props.highlightedCurves, prevHighlightedCurvesRef.current);
        prevHighlightedCurvesRef.current = cloneDeep(props.highlightedCurves || []);
    }

    function updatePlotly(
        data: Data[],
        layout: Partial<Plotly.Layout>,
        newHighlightedCurves?: HighlightedCurve[],
        oldHighlightedCurves?: HighlightedCurve[]
    ) {
        promiseRef.current = promiseRef.current
            .then(() => {
                if (isUnmounting) {
                    return;
                }
                const graphDiv = divRef.current as unknown as PlotlyHTMLElement;
                if (!graphDiv) {
                    return;
                }

                return Plotly.react(graphDiv, data, layout, props.config);
            })
            .then(() => {
                setPrevHighlightedCurves(cloneDeep(newHighlightedCurves));
                updateHighlightedCurves(newHighlightedCurves, oldHighlightedCurves, true);
                prevHighlightedCurvesRef.current = cloneDeep(props.highlightedCurves || []);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    function updateHighlightedCurves(
        newHighlightedCurves?: HighlightedCurve[],
        oldHighlightedCurves?: HighlightedCurve[],
        plotlyUpdated = false
    ) {
        if (isUnmounting) {
            return;
        }

        const graphDiv = divRef.current as unknown as PlotlyHTMLElement;
        if (!graphDiv) {
            return;
        }

        const highlightedCurveNumbers = (newHighlightedCurves ?? []).map(
            (highlightedCurve) => highlightedCurve.curveNumber
        );

        if (!plotlyUpdated && oldHighlightedCurves && oldHighlightedCurves.length > 0) {
            const tracesToBeDeleted = [];
            for (let i = 0; i < oldHighlightedCurves.length; i++) {
                tracesToBeDeleted.push(-i - 1);
            }
            console.debug("delete traces", tracesToBeDeleted);
            Plotly.deleteTraces(graphDiv, tracesToBeDeleted);
        }

        if (newHighlightedCurves) {
            if (highlightedCurveNumbers.length > 0) {
                const traces: Data[] = [];
                newHighlightedCurves.forEach((highlightedCurve) => {
                    const dataObj: Data = data[highlightedCurve.curveNumber];
                    if (dataObj && dataObj.type === "scatter") {
                        traces.push({
                            ...dataObj,
                            marker: {
                                ...dataObj.marker,
                                color: highlightedCurve.color,
                            },
                            line: {
                                ...dataObj.line,
                                color: highlightedCurve.color,
                            },
                            showlegend: false,
                        });
                    } else {
                        console.warn("highlighted curve is not a scatter plot", dataObj);
                    }
                    console.debug("add traces", traces);
                    Plotly.addTraces(graphDiv, traces);
                });
            }
        }
    }

    React.useEffect(function handleMount() {
        let interactionDisabled = false;
        const graphDiv = divRef.current as unknown as PlotlyHTMLElement;
        setIsUnmounting(false);

        function handleHover(event: Plotly.PlotHoverEvent) {
            if (!interactionDisabled) {
                if (hoverTimeout.current) {
                    clearTimeout(hoverTimeout.current);
                }
                hoverTimeout.current = setTimeout(() => {
                    if (props.onHover && event.points[0].data.showlegend !== false) {
                        props.onHover(event);
                    }
                }, 100);
            }
        }

        function handleUnHover() {
            if (props.onUnhover && !interactionDisabled) {
                if (hoverTimeout.current) {
                    clearTimeout(hoverTimeout.current);
                }

                hoverTimeout.current = setTimeout(() => props.onUnhover && props.onUnhover(), 100);
            }
        }

        // When zooming in, the relayout function is only called once there hasn't been a wheel event in a certain time.
        // However, the hover event would still be sent and might update the data, causing a layout change and, hence,
        // a jump in the plot's zoom. To prevent this, we disable the hover event for a certain time after a wheel event.
        function handleWheel() {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            interactionDisabled = true;
            timeout.current = setTimeout(() => {
                interactionDisabled = false;
            }, 500);
        }

        function handleTouchZoom(e: TouchEvent) {
            if (e.touches.length === 2) {
                handleWheel();
            }
        }

        if (graphDiv) {
            Plotly.newPlot(graphDiv, data, layout, props.config);
            graphDiv.on("plotly_hover", handleHover);
            graphDiv.on("plotly_unhover", handleUnHover);
            graphDiv.addEventListener("wheel", handleWheel);
            graphDiv.addEventListener("touchmove", handleTouchZoom);
        }

        return function handleUnmount() {
            if (graphDiv) {
                setIsUnmounting(true);
                graphDiv.removeAllListeners("plotly_hover");
                graphDiv.removeAllListeners("plotly_unhover");
                graphDiv.removeEventListener("wheel", handleWheel);
                graphDiv.removeEventListener("touchmove", handleTouchZoom);
                Plotly.purge(graphDiv);
            }
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            if (hoverTimeout.current) {
                clearTimeout(hoverTimeout.current);
            }
        };
    }, []);

    return <div ref={divRef} style={{ width: props.width, height: props.height }} />;
};
