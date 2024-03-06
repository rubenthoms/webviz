import React from "react";

import { AxisOptions, Controller, GridLayer, HTMLLayer, IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { useElementSize } from "@lib/hooks/useElementSize";
import { Point2D, Size2D, pointRelativeToDomRect, pointerEventToPoint } from "@lib/utils/geometry";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { isEqual } from "lodash";

export type EsvIntersectionProps = {
    size?: Size2D;
    showGrid?: boolean;
    axesOptions?: AxisOptions;
    layers?: HTMLLayer<any>[];
    bounds?: {
        x: [number, number];
        y: [number, number];
    };
    viewport?: [number, number, number];
    intersectionReferenceSystem?: IntersectionReferenceSystem;
};

export function EsvIntersection(props: EsvIntersectionProps): React.ReactNode {
    const [prevShowGrid, setPrevShowGrid] = React.useState<boolean | undefined>(undefined);
    const [prevContainerSize, setPrevContainerSize] = React.useState<Size2D | undefined>(undefined);
    const [prevLayerIds, setPrevLayerIds] = React.useState<string[]>([]);
    const [prevBounds, setPrevBounds] = React.useState<{ x: [number, number]; y: [number, number] } | undefined>(
        undefined
    );
    const [prevViewport, setPrevViewport] = React.useState<[number, number, number] | undefined>(undefined);
    const [prevRevision, setPrevRevision] = React.useState<number>(0);
    const [currentRevision, setCurrentRevision] = React.useState<number>(0);

    const [pointerPosition, setPointerPosition] = React.useState<Point2D | null>(null);

    const esvControllerRef = React.useRef<Controller | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const containerSize = useElementSize(containerRef);

    if (esvControllerRef.current) {
        if (prevShowGrid !== props.showGrid || currentRevision !== prevRevision) {
            if (props.showGrid) {
                esvControllerRef.current.addLayer(new GridLayer("grid"));
            } else {
                esvControllerRef.current.removeLayer("grid");
            }
            setPrevShowGrid(props.showGrid);
        }

        if (!isEqual(prevContainerSize, containerSize) || currentRevision !== prevRevision) {
            esvControllerRef.current.adjustToSize(containerSize.width, containerSize.height);
            setPrevContainerSize(containerSize);
        }

        if (!isEqual(prevBounds, props.bounds) || currentRevision !== prevRevision) {
            if (props.bounds?.x && props.bounds?.y) {
                esvControllerRef.current.setBounds(props.bounds.x, props.bounds.y);
            }
            setPrevBounds(props.bounds);
        }

        if (!isEqual(prevViewport, props.viewport) || currentRevision !== prevRevision) {
            if (props.viewport) {
                esvControllerRef.current.setViewport(...props.viewport);
            }
            setPrevViewport(props.viewport);
        }

        const layerIds = props.layers?.map((layer) => layer.id) ?? [];
        if (!isEqual(prevLayerIds, layerIds) || currentRevision !== prevRevision) {
            for (const layer of props.layers ?? []) {
                if (!prevLayerIds.includes(layer.id)) {
                    esvControllerRef.current.addLayer(layer);
                }
            }

            for (const layerId of prevLayerIds) {
                if (!layerIds.includes(layerId)) {
                    esvControllerRef.current.removeLayer(layerId);
                }
            }

            setPrevLayerIds(layerIds ?? []);
        }

        if (currentRevision !== prevRevision) {
            setPrevRevision(currentRevision);
        }
    }

    React.useEffect(
        function handleInitController() {
            const containerRefCurrent = containerRef.current;
            if (!containerRefCurrent) {
                return;
            }

            esvControllerRef.current = new Controller({
                container: containerRefCurrent,
                axisOptions: props.axesOptions,
                referenceSystem: props.intersectionReferenceSystem,
            });

            setCurrentRevision((prev) => prev + 1);

            const esvControllerRefCurrent = esvControllerRef.current;

            esvControllerRefCurrent.overlay.create("focus_displacement", {
                onMouseMove: (event) => {
                    const { caller, x, y } = event;

                    const displacement = caller.currentStateAsEvent.xScale.invert(x);
                    if (displacement && caller?.referenceSystem) {
                        const { curtain } = caller.referenceSystem.interpolators;
                        const { minX, maxX } = curtain;
                        if ((displacement <= maxX && displacement >= minX) || (displacement < 0 && maxX >= 1000)) {
                            const tvd = caller.currentStateAsEvent.yScale.invert(y);

                            const target = [displacement, tvd];

                            const nearestPoint = curtain.getNearestPosition(target);
                            const md = nearestPoint.distance + caller.referenceSystem.offset;

                            console.debug(md);
                        }
                    }
                },
            });

            const currentContainerSize = containerRefCurrent.getBoundingClientRect();

            esvControllerRef.current.adjustToSize(currentContainerSize.width, currentContainerSize.height);

            return function handleDestroyController() {
                esvControllerRefCurrent.destroy();
            };
        },
        [props.axesOptions, props.intersectionReferenceSystem]
    );

    return (
        <>
            <div
                ref={containerRef}
                className={resolveClassNames({ "w-full h-full": props.size === undefined })}
                style={props.size}
            ></div>
        </>
    );
}
