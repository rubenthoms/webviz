import React from "react";

import { Layer as DeckGlLayer, View as DeckGlView } from "@deck.gl/core";
import { DeckGLRef } from "@deck.gl/react";
import { SubsurfaceViewerWithCameraState } from "@modules/_shared/components/SubsurfaceViewerWithCameraState";
import { MapMouseEvent, ViewStateType, ViewsType } from "@webviz/subsurface-viewer";

import { ReadoutBoxWrapper } from "./ReadoutBoxWrapper";
import { Toolbar } from "./Toolbar";

import { CursorTrackingLayer } from "../customDeckGlLayers/CursorTrackingLayer";
import { MultiViewPickingInfoAssembler, PickingInfoPerView } from "../utils/MultiViewPickingInfoAssembler";

export type ViewportAnnotation = {
    viewportId: string;
    content: React.ReactNode;
};

export type ReadooutWrapperProps = {
    views: ViewsType;
    viewportAnnotations: ViewportAnnotation[];
    layers: DeckGlLayer[];
    bounds?: [number, number, number, number];
};

export function ReadoutWrapper(props: ReadooutWrapperProps): React.ReactNode {
    const id = React.useId();
    const deckGlRef = React.useRef<DeckGLRef>(null);
    const assembler = React.useRef<MultiViewPickingInfoAssembler | null>(null);

    const [cameraPositionSetByAction, setCameraPositionSetByAction] = React.useState<ViewStateType | null>(null);
    const [triggerHomeCounter, setTriggerHomeCounter] = React.useState<number>(0);
    const [pickingInfo, setPickingInfo] = React.useState<PickingInfoPerView>({});
    const [activeViewPortId, setActiveViewPortId] = React.useState<string>("");

    React.useEffect(function onMountEffect() {
        assembler.current = new MultiViewPickingInfoAssembler(deckGlRef.current, { multiPicking: true, pickDepth: 5 });

        const unsubscribe = assembler.current.subscribe((info, activeViewPortId) => {
            setPickingInfo(info);
            setActiveViewPortId(activeViewPortId);
        });

        return function onUnmountEffect() {
            unsubscribe();
        };
    }, []);

    function handleFitInViewClick() {
        setTriggerHomeCounter((prev) => prev + 1);
    }

    function handleMouseEvent(event: MapMouseEvent): void {
        if (event.type === "hover") {
            assembler.current?.getMultiViewPickingInfo(event);
        }
    }

    const currentCursorWorldCoordinates: [number, number] | null = pickingInfo[activeViewPortId]?.coordinates
        ? [pickingInfo[activeViewPortId].coordinates?.x ?? 0, pickingInfo[activeViewPortId].coordinates?.y ?? 0]
        : null;
    const adjustedViews = props.views.viewports.map((view) => {
        if (view.id === activeViewPortId) {
            return view;
        }
        return {
            ...view,
            layerIds: [...(view.layerIds ?? []), "cursor-tracking"],
        };
    });
    const adjustedLayers = [
        ...props.layers,
        new CursorTrackingLayer({ id: "cursor-tracking", worldCoordinates: currentCursorWorldCoordinates }),
    ];

    return (
        <>
            <Toolbar onFitInView={handleFitInViewClick} />
            <SubsurfaceViewerWithCameraState
                id={`subsurface-viewer-${id}`}
                deckGlRef={deckGlRef}
                views={{ ...props.views, viewports: adjustedViews }}
                bounds={props.bounds}
                cameraPosition={cameraPositionSetByAction ?? undefined}
                onCameraPositionApplied={() => setCameraPositionSetByAction(null)}
                onMouseEvent={handleMouseEvent}
                layers={adjustedLayers}
                scale={{
                    visible: true,
                    incrementValue: 100,
                    widthPerUnit: 100,
                    cssStyle: {
                        right: 10,
                        top: 10,
                    },
                }}
                coords={{
                    visible: false,
                    multiPicking: true,
                    pickDepth: 1,
                }}
                triggerHome={triggerHomeCounter}
                pickingRadius={5}
            >
                {props.viewportAnnotations.map((annotation) => (
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    /* @ts-expect-error */
                    <DeckGlView key={annotation.viewportId} id={annotation.viewportId}>
                        {annotation.content}
                        <ReadoutBoxWrapper
                            position={pickingInfo[annotation.viewportId]?.coordinates}
                            layerPickInfo={pickingInfo[annotation.viewportId]?.layerPickingInfo}
                            visible
                        />
                    </DeckGlView>
                ))}
            </SubsurfaceViewerWithCameraState>
            {props.views.viewports.length === 0 && (
                <div className="absolute left-1/2 top-1/2 w-64 h-10 -ml-32 -mt-5 text-center">
                    Please add views and layers in the settings panel.
                </div>
            )}
        </>
    );
}
