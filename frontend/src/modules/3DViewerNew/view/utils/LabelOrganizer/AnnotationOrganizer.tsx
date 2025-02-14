import React from "react";

import { Layer, View } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import {
    PublishSubscribe,
    PublishSubscribeDelegate,
    usePublishSubscribeTopicValue,
} from "@modules/_shared/utils/PublishSubscribeDelegate";

import { Vec2 } from "./utils/definitions";
import { mixVec2 } from "./utils/helpers";
import { Annotation, AnnotationInstance, AnnotationInstanceState } from "./utils/types";
import { postProcessInstances, preprocessInstances, updateInstanceDOMElements } from "./utils/update-annotations";

export type AnnotationOrganizerParams = {
    labelOffset?: number;
    distanceFactor?: number;
    minDistance?: number;
    maxDistance?: number;
    anchorOcclusionRadius?: number;
    anchorSize?: number;
    anchorColor?: string;
    connectorWidth?: number;
    connectorColor?: string;
};

const defaultAnnotationOrganizerProps: Required<AnnotationOrganizerParams> = {
    labelOffset: 10,
    distanceFactor: 100,
    minDistance: 10,
    maxDistance: 10000,
    anchorOcclusionRadius: 10,
    anchorSize: 0.25,
    anchorColor: "black",
    connectorWidth: 1,
    connectorColor: "black",
};

export enum AnnotationOrganizerTopic {
    INSTANCES = "instances",
}

export type AnnotationOrganizerTopicPayloads = {
    [AnnotationOrganizerTopic.INSTANCES]: AnnotationInstance[];
};

export class AnnotationOrganizer implements PublishSubscribe<AnnotationOrganizerTopicPayloads> {
    private _annotationsMap: Map<string, Annotation[]> = new Map();
    private _annotationInstances: AnnotationInstance[] = [];
    private _params: Required<AnnotationOrganizerParams>;

    private _publishSubscribeDelegate = new PublishSubscribeDelegate<AnnotationOrganizerTopicPayloads>();

    private _ref: DeckGLRef | null = null;

    constructor(params: AnnotationOrganizerParams) {
        this._params = {
            labelOffset: params.labelOffset ?? defaultAnnotationOrganizerProps.labelOffset,
            distanceFactor: params.distanceFactor ?? defaultAnnotationOrganizerProps.distanceFactor,
            minDistance: params.minDistance ?? defaultAnnotationOrganizerProps.minDistance,
            maxDistance: params.maxDistance ?? defaultAnnotationOrganizerProps.maxDistance,
            anchorOcclusionRadius:
                params.anchorOcclusionRadius ?? defaultAnnotationOrganizerProps.anchorOcclusionRadius,
            anchorSize: params.anchorSize ?? defaultAnnotationOrganizerProps.anchorSize,
            anchorColor: params.anchorColor ?? defaultAnnotationOrganizerProps.anchorColor,
            connectorWidth: params.connectorWidth ?? defaultAnnotationOrganizerProps.connectorWidth,
            connectorColor: params.connectorColor ?? defaultAnnotationOrganizerProps.connectorColor,
        };
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<AnnotationOrganizerTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends AnnotationOrganizerTopic.INSTANCES>(
        topic: T
    ): () => AnnotationOrganizerTopicPayloads[T] {
        const snapshotGetter = (): any => {
            if (topic === AnnotationOrganizerTopic.INSTANCES) {
                return this._annotationInstances;
            }
        };
        return snapshotGetter;
    }

    setDeckRef(ref: DeckGLRef | null) {
        this._ref = ref;
    }

    getParams() {
        return this._params;
    }

    private isInitialized() {
        return this._ref?.deck?.isInitialized;
    }

    getViewports() {
        if (!this.isInitialized()) {
            return [];
        }
        return this._ref!.deck!.getViewports();
    }

    getAnnotationInstancesForLayer(layerId: string) {
        return this._annotationInstances.filter((instance) => instance.layerId === layerId);
    }

    private makeAnnotationInstances(): void {
        const instancesMap: Map<string, AnnotationInstance> = new Map(this._annotationInstances.map((i) => [i.id, i]));
        const instances: AnnotationInstance[] = [];

        const priorityRange = [0, 0];

        for (const [layerId, annotations] of this._annotationsMap) {
            for (const annotation of annotations) {
                const id = `${layerId}_${annotation.scope}_${annotation.id}`;

                const existingInstance = instancesMap.get(id);
                let instance: AnnotationInstance;

                if (existingInstance) {
                    instance = {
                        ...existingInstance,
                        annotation: {
                            ...existingInstance.annotation,
                            ...annotation,
                        },
                    };
                } else {
                    instance = {
                        id,
                        ref: React.createRef<HTMLDivElement>(),
                        layerId: layerId,
                        organizer: this,
                        annotation,
                        priority: 0,
                        rank: 0,
                        state: {
                            visible: false,
                            distance: Infinity,
                            health: 0,
                            labelWidth: 0,
                            labelHeight: 0,
                            screenPosition: [0, 0, 0],
                            zIndex: 0,
                        },
                    };
                }

                instance.priority = annotation.priority ?? 0;
                priorityRange[0] = Math.min(priorityRange[0], instance.priority);
                priorityRange[1] = Math.max(priorityRange[1], instance.priority);

                instances.push(instance);
            }
        }

        const prioritySpan = Math.abs(priorityRange[1] - priorityRange[0]);

        instances.forEach((instance) => {
            instance.priority = prioritySpan > 0 ? (instance.priority - priorityRange[0]) / prioritySpan : 0;
        });

        this._annotationInstances = instances;

        this._publishSubscribeDelegate.notifySubscribers(AnnotationOrganizerTopic.INSTANCES);
    }

    registerAnnotations(layerId: string, annotations: Annotation[]) {
        this._annotationsMap.set(layerId, annotations);
        this.makeAnnotationInstances();
    }
}

export type UseAnnotationsProps = {
    organizer: AnnotationOrganizer;
    layers: Layer<any>[];
    maxVisibleAnnotations?: number;
};

let x1: number, x2: number, y1: number, y2: number;

export function useAnnotations(props: UseAnnotationsProps): React.ReactNode[] {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const instances = usePublishSubscribeTopicValue(props.organizer, AnnotationOrganizerTopic.INSTANCES);
    const [globalCursor, setGlobalCursor] = React.useState<Vec2>([0, 0]);

    React.useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            setGlobalCursor([event.clientX, event.clientY]);
        };

        document.addEventListener("mousemove", handleMouseMove);

        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
        };
    }, []);

    const render = React.useCallback(
        function render() {
            const viewports = props.organizer.getViewports();
            const ctx = canvasRef.current?.getContext("2d");

            if (!ctx) {
                return;
            }
            for (const viewport of viewports) {
                const size: Vec2 = [viewport.width, viewport.height];

                ctx.clearRect(0, 0, size[0], size[1]);

                const cursor = [globalCursor[0] - viewport.x, globalCursor[1] - viewport.y];

                const inViewSpace = preprocessInstances(instances, viewport, props.maxVisibleAnnotations ?? 100);

                if (!inViewSpace.length) {
                    updateInstanceDOMElements(instances);
                    return;
                }

                postProcessInstances(inViewSpace, size);

                // Maybe do some occlusion culling here
                updateInstanceDOMElements(instances);

                const sorted = inViewSpace.sort((a, b) => b.state.distance - a.state.distance);

                for (const instance of sorted) {
                    if (instance.state.occluded || instance.state.capped) {
                        continue;
                    }

                    x1 = (instance.state.screenPosition[0] * 0.5 + 0.5) * size[0];
                    y1 = (-instance.state.screenPosition[1] * 0.5 + 0.5) * size[1];

                    let radius = instance.organizer.getParams().anchorSize * instance.state.scaleFactor!;
                    let anchorHovered = false;
                    // boost instance if not visible and cursor is over anchor point
                    if (Math.abs(cursor[0] - x1) <= radius && Math.abs(cursor[1] - y1) <= radius) {
                        if (instance.state.visible) {
                            anchorHovered = true;
                        } else {
                            instance.state.boost = true;
                        }
                    }

                    if (instance.state.labelHovered || anchorHovered) {
                        radius *= 1.5;
                    }

                    if (instance.organizer.getParams().labelOffset > 0 && instance.state.visible) {
                        // connector
                        if (instance.state.inTransition && instance.state.prevAnchorPosition) {
                            [x2, y2] = mixVec2(
                                instance.state.prevAnchorPosition,
                                instance.state.anchorPosition!,
                                instance.state.transitionTime
                            );
                        } else {
                            [x2, y2] = instance.state.anchorPosition!;
                        }

                        let strokeWidth = Math.max(
                            0.1,
                            instance.organizer.getParams().connectorWidth * instance.state.scaleFactor!
                        );
                        if (instance.state.labelHovered || anchorHovered) {
                            strokeWidth *= 2;
                        }

                        ctx.globalAlpha = instance.state.opacity || 0;
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);

                        ctx.strokeStyle = instance.organizer.getParams().connectorColor;
                        ctx.lineWidth = strokeWidth;
                        ctx.stroke();
                    }

                    // anchorpoint
                    ctx.beginPath();
                    ctx.arc(x1, y1, radius, 0, Math.PI * 2);

                    ctx.globalAlpha = instance.state.visible ? 1 : 0.5;
                    ctx.fillStyle = instance.organizer.getParams().anchorColor;

                    ctx.fill();

                    ctx.globalAlpha = instance.state.opacity || 0;
                    ctx.strokeStyle = "black";
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
            }
        },
        [globalCursor, instances, props]
    );

    React.useEffect(
        function setupRenderLoop() {
            let isMounted = true;
            function renderLoop() {
                render();

                if (!isMounted) {
                    return;
                }
                requestAnimationFrame(renderLoop);
            }
            renderLoop();
        },
        [render]
    );

    const viewports = props.organizer.getViewports();
    const nodes: React.ReactNode[] = [];
    for (const viewport of viewports) {
        nodes.push(
            /* @ts-expect-error*/
            <View key={viewport.id} id={viewport.id}>
                <AnnotationComponentsContainer organizer={props.organizer} />
                <canvas ref={canvasRef} className="w-full h-full absolute inset-0" />
            </View>
        );
    }

    return nodes;
}

export type AnnotationComponentsContainerProps = {
    organizer: AnnotationOrganizer;
};

export function AnnotationComponentsContainer(props: AnnotationComponentsContainerProps) {
    const instances = usePublishSubscribeTopicValue(props.organizer, AnnotationOrganizerTopic.INSTANCES);

    return (
        <div className="h-full w-full relative inset-0 overflow-hidden">
            {instances.map((instance) => (
                <AnnotationComponent
                    key={instance.id}
                    id={instance.id}
                    annotation={instance.annotation}
                    ref={instance.ref}
                    state={instance.state}
                />
            ))}
        </div>
    );
}

type AnnotationComponentProps = {
    id: string;
    state: AnnotationInstanceState;
    annotation: Annotation;
};

const AnnotationComponent = React.forwardRef((props: AnnotationComponentProps, ref: React.Ref<HTMLDivElement>) => {
    const onPointerEnter = React.useCallback(() => {
        props.state.labelHovered = true;
    }, [props.state]);

    const onPointerLeave = React.useCallback(() => {
        props.state.labelHovered = false;
    }, [props.state]);

    return (
        <div
            ref={ref}
            className="absolute cursor-pointer"
            style={{
                top: 0,
                left: 0,
                visibility: "hidden",
                userSelect: "none",
                pointerEvents: "visible",
            }}
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
        >
            <div
                key={props.id}
                id={`annotation_${props.id}`}
                style={{
                    minWidth: "150px",
                    background: "#33333390",
                    color: "white",
                    textAlign: "center",
                    overflow: "hidden",
                    borderRadius: "4px",
                    padding: "1px 6px",
                    fontFamily: "sans-serif",
                    fontSize: "12pt",
                }}
            >
                <div style={{ whiteSpace: "nowrap" }}>{props.annotation.name}</div>
            </div>
        </div>
    );
});
