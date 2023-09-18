import React from "react";

import { cloneDeep, isEqual } from "lodash";
import Plotly, { PlotlyHTMLElement } from "plotly.js-dist-min";

export type HighlightedCurve = {
    curveNumber: number;
    width?: number;
    color?: string;
    opacityDiff?: number;
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
    onUnhover?: (event: Plotly.PlotMouseEvent) => void;

    onClick?: (event: Plotly.PlotMouseEvent) => void;

    onSelect?: (event: Plotly.PlotSelectionEvent) => void;
    onUnselect?: () => void;

    height?: number;
    width?: number;
    revisionNumber?: number;
};

function filterDataItems(data: Data[], curveNumbers: number[]) {
    const filteredData: Data[] = [];
    for (const curveNumber of curveNumbers) {
        const dataItem = data[curveNumber];
        if (!dataItem) {
            continue;
        }
        if (dataItem.type === "scatter" || dataItem.type === "scattergl") {
            filteredData.push({
                ...dataItem,
            });
        }
    }
    return filteredData;
}

export const AdvancedPlot: React.FC<AdvancedPlotProps> = (props) => {
    const [isUnmounting, setIsUnmounting] = React.useState<boolean>(false);
    const [hoverDisabled, setHoverDisabled] = React.useState<boolean>(false);
    const [data, setData] = React.useState<Data[]>(props.data);
    const [layout, setLayout] = React.useState<Partial<Plotly.Layout>>(cloneDeep(props.layout));
    const [prevData, setPrevData] = React.useState<Data[]>(props.data);
    const [prevLayout, setPrevLayout] = React.useState<Partial<Plotly.Layout>>(cloneDeep(props.layout));
    const [prevFrames, setPrevFrames] = React.useState<Plotly.Frame[] | undefined>(props.frames || undefined);
    const [prevRevisionNumber, setPrevRevisionNumber] = React.useState<number | undefined>(undefined);

    const prevHighlightedCurvesRef = React.useRef<HighlightedCurve[]>([]);

    const divRef = React.useRef<HTMLDivElement>(null);
    const promiseRef = React.useRef<Promise<void>>(Promise.resolve());
    const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const hoverTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const highlightedCurvesToCurveNumbersMapping = React.useRef<Map<number, number>>(new Map());
    const interactionDisabled = React.useRef<boolean>(false);

    let changes = false;
    let currentData = data;
    let currentLayout = layout;

    let dataHasChanged = props.revisionNumber === undefined && props.data !== prevData;
    dataHasChanged = dataHasChanged || props.revisionNumber !== prevRevisionNumber;

    if (dataHasChanged) {
        changes = true;
        setData(props.data);
        setPrevData(props.data);
        setPrevRevisionNumber(props.revisionNumber);
        currentData = props.data;
    }

    if (!isEqual(props.layout, prevLayout)) {
        changes = true;
        setLayout(cloneDeep(props.layout));
        setPrevLayout(cloneDeep(props.layout));
        currentLayout = cloneDeep(props.layout);
    }

    if (!isEqual(props.frames, prevFrames)) {
        changes = true;
        setPrevFrames(props.frames);
    }

    if (changes) {
        setHoverDisabled(true);
        updatePlotly(currentData, currentLayout, props.highlightedCurves, cloneDeep(prevHighlightedCurvesRef.current));
        prevHighlightedCurvesRef.current = cloneDeep(props.highlightedCurves || []);
    } else if (!isEqual(props.highlightedCurves, prevHighlightedCurvesRef.current)) {
        updateHighlightedCurves(props.highlightedCurves, cloneDeep(prevHighlightedCurvesRef.current));
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
                updateHighlightedCurves(newHighlightedCurves, oldHighlightedCurves, true);
            })
            .catch((error) => {
                console.error(error);
            })
            .finally(() => {
                setHoverDisabled(false);
            });
    }

    function updateHighlightedCurves(
        newHighlightedCurves?: HighlightedCurve[],
        prevHighlightedCurves?: HighlightedCurve[],
        plotlyUpdated = false
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

                if (!plotlyUpdated && prevHighlightedCurves) {
                    const prevHighlightedCurveNumbers = prevHighlightedCurves.map((curve) => curve.curveNumber);
                    const filteredDataItems = filterDataItems(data, prevHighlightedCurveNumbers);
                    if (filteredDataItems.length > 0) {
                        const tracesToBeDeleted = [];
                        for (let i = 0; i < filteredDataItems.length; i++) {
                            tracesToBeDeleted.push(-i - 1);
                        }
                        highlightedCurvesToCurveNumbersMapping.current.clear();
                        if (tracesToBeDeleted.length > 0) {
                            return Plotly.deleteTraces(graphDiv, tracesToBeDeleted);
                        }
                    }
                }
            })
            .then(() => {
                if (isUnmounting) {
                    return;
                }

                const graphDiv = divRef.current as unknown as PlotlyHTMLElement;
                if (!graphDiv) {
                    return;
                }

                if (newHighlightedCurves) {
                    let mainOpacity = 100;
                    const highlightedCurveNumbers: number[] = [];
                    newHighlightedCurves.forEach((highlightedCurve) => {
                        mainOpacity = Math.min(mainOpacity, 100 - (highlightedCurve.opacityDiff ?? 0));
                        highlightedCurveNumbers.push(highlightedCurve.curveNumber);
                    });
                    if (highlightedCurveNumbers.length > 0) {
                        Plotly.restyle(graphDiv, {
                            opacity: mainOpacity / 100,
                        }).then(() => {
                            interactionDisabled.current = true;
                            const traces: Data[] = [];
                            newHighlightedCurves.forEach((highlightedCurve) => {
                                const dataItem: Data = data[highlightedCurve.curveNumber];
                                if (!dataItem) {
                                    return;
                                }
                                if (dataItem.type === "scatter" || dataItem.type === "scattergl") {
                                    traces.push({
                                        ...dataItem,
                                        marker: {
                                            ...dataItem.marker,
                                            width: highlightedCurve.width,
                                            color: highlightedCurve.color ?? dataItem.marker?.color,
                                        },
                                        line: {
                                            ...dataItem.line,
                                            width: highlightedCurve.width,
                                            color: highlightedCurve.color ?? dataItem.line?.color,
                                        },
                                        opacity:
                                            highlightedCurve.opacityDiff !== undefined
                                                ? (mainOpacity + highlightedCurve.opacityDiff) / 100
                                                : 1,
                                        showlegend: false,
                                    });
                                    highlightedCurvesToCurveNumbersMapping.current.set(
                                        data.length + traces.length - 1,
                                        highlightedCurve.curveNumber
                                    );
                                }
                            });
                            Plotly.addTraces(graphDiv, traces).then(() => {
                                interactionDisabled.current = false;
                            });
                        });
                    } else {
                        Plotly.restyle(graphDiv, {
                            opacity: 1,
                        });
                    }
                }
            })
            .finally(() => {
                prevHighlightedCurvesRef.current = cloneDeep(props.highlightedCurves || []);
            });
    }

    React.useEffect(function handleMount() {
        const graphDiv = divRef.current as unknown as PlotlyHTMLElement;
        setIsUnmounting(false);

        function handleRelayout(event: Plotly.PlotRelayoutEvent) {
            setLayout((prev) => ({
                ...prev,
                ...event,
            }));
        }

        // When zooming in, the relayout function is only called once there hasn't been a wheel event in a certain time.
        // However, the hover event would still be sent and might update the data, causing a layout change and, hence,
        // a jump in the plot's zoom. To prevent this, we disable the hover event for a certain time after a wheel event.
        function handleWheel() {
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
            interactionDisabled.current = true;
            timeout.current = setTimeout(() => {
                interactionDisabled.current = false;
            }, 500);
        }

        function handleTouchZoom(e: TouchEvent) {
            if (e.touches.length === 2) {
                handleWheel();
            }
        }

        if (graphDiv) {
            Plotly.newPlot(graphDiv, data, layout, props.config);
            graphDiv.on("plotly_relayout", handleRelayout);
            graphDiv.addEventListener("wheel", handleWheel);
            graphDiv.addEventListener("touchmove", handleTouchZoom);
        }

        return function handleUnmount() {
            if (graphDiv) {
                graphDiv.removeEventListener("wheel", handleWheel);
                graphDiv.removeEventListener("touchmove", handleTouchZoom);
                setIsUnmounting(true);
                // Purge should remove all event listeners
                // https://github.com/plotly/plotly.js/blob/a5577d994ea06785be100f9e7decff3e6cd8ab1f/src/plots/plots.js#L1817
                Plotly.purge(graphDiv);
            }
            if (timeout.current) {
                clearTimeout(timeout.current);
            }
        };
    }, []);

    React.useEffect(
        function addHoverEventHandlers() {
            const graphDiv = divRef.current as unknown as PlotlyHTMLElement;

            function handleHover(event: Plotly.PlotHoverEvent) {
                if (!interactionDisabled.current && !hoverDisabled && !isUnmounting) {
                    if (hoverTimeout.current) {
                        clearTimeout(hoverTimeout.current);
                    }
                    hoverTimeout.current = setTimeout(() => {
                        if (props.onHover) {
                            const points = event.points.map((point) => {
                                const curveNumber = highlightedCurvesToCurveNumbersMapping.current.get(
                                    point.curveNumber
                                );
                                if (curveNumber !== undefined) {
                                    return {
                                        ...point,
                                        curveNumber,
                                    };
                                }
                                return point;
                            });
                            props.onHover({ ...event, points });
                        }
                    }, 50);
                }
            }

            function handleUnhover(event: Plotly.PlotMouseEvent) {
                if (!interactionDisabled.current && !hoverDisabled && !isUnmounting) {
                    if (hoverTimeout.current) {
                        clearTimeout(hoverTimeout.current);
                    }

                    hoverTimeout.current = setTimeout(() => {
                        if (props.onUnhover) {
                            props.onUnhover(event);
                        }
                    }, 200);
                }
            }

            if (graphDiv && !isUnmounting) {
                graphDiv.on("plotly_hover", handleHover);
                graphDiv.on("plotly_unhover", handleUnhover);
            }

            return function removeHoverEventHandlers() {
                if (graphDiv) {
                    if (graphDiv.removeAllListeners) {
                        // Doc is pretty bad, but "handler" is probably the event name
                        graphDiv.removeAllListeners("plotly_hover");
                        graphDiv.removeAllListeners("plotly_unhover");
                    }
                }
                if (hoverTimeout.current) {
                    clearTimeout(hoverTimeout.current);
                }
            };
        },
        [props.onHover, props.onUnhover, isUnmounting, hoverDisabled]
    );

    React.useEffect(
        function addSelectEventHandlers() {
            const graphDiv = divRef.current as unknown as PlotlyHTMLElement;

            function handleSelect(event: Plotly.PlotSelectionEvent) {
                if (!interactionDisabled.current && !isUnmounting) {
                    if (props.onSelect) {
                        const points = event.points.map((point) => {
                            const curveNumber = highlightedCurvesToCurveNumbersMapping.current.get(point.curveNumber);
                            if (curveNumber !== undefined) {
                                return {
                                    ...point,
                                    curveNumber,
                                };
                            }
                            return point;
                        });
                        props.onSelect({ ...event, points });
                    }
                }
            }

            function handleUnselect() {
                if (!interactionDisabled.current && !isUnmounting) {
                    if (props.onUnselect) {
                        props.onUnselect();
                    }
                }
            }

            if (graphDiv && !isUnmounting) {
                graphDiv.on("plotly_selected", handleSelect);
                graphDiv.on("plotly_deselect", handleUnselect);
            }

            return function removeSelectEventHandlers() {
                if (graphDiv) {
                    if (graphDiv.removeAllListeners) {
                        // Doc is pretty bad, but "handler" is probably the event name
                        graphDiv.removeAllListeners("plotly_selected");
                        graphDiv.removeAllListeners("plotly_deselect");
                    }
                }
            };
        },
        [props.onSelect, props.onUnselect, isUnmounting]
    );

    React.useEffect(
        function addClickEventHandlers() {
            const graphDiv = divRef.current as unknown as PlotlyHTMLElement;

            function handleClick(event: Plotly.PlotMouseEvent) {
                if (!interactionDisabled.current && !isUnmounting) {
                    if (props.onClick) {
                        const points = event.points.map((point) => {
                            const curveNumber = highlightedCurvesToCurveNumbersMapping.current.get(point.curveNumber);
                            if (curveNumber !== undefined) {
                                return {
                                    ...point,
                                    curveNumber,
                                };
                            }
                            return point;
                        });
                        props.onClick({ ...event, points });
                    }
                }
            }

            if (graphDiv && !isUnmounting) {
                graphDiv.on("plotly_click", handleClick);
            }

            return function removeClickEventHandlers() {
                if (graphDiv) {
                    if (graphDiv.removeAllListeners) {
                        // Doc is pretty bad, but "handler" is probably the event name
                        graphDiv.removeAllListeners("plotly_click");
                    }
                }
            };
        },
        [props.onSelect, props.onUnselect, isUnmounting]
    );

    return <div ref={divRef} style={{ width: props.width, height: props.height }} />;
};
