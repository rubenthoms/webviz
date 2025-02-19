import React from "react";

import { Layer } from "@deck.gl/core";

import { AnnotationOrganizer, useAnnotations } from "../utils/AnnotationOrganizer/AnnotationOrganizer";

export type AnnotationsWrapperProps = {
    layers: Layer[];
    annotationOrganizer: AnnotationOrganizer;
};

export function AnnotationsWrapper(props: AnnotationsWrapperProps): React.ReactNode {
    const [annotations, renderAnnotations] = useAnnotations({
        layers: props.layers,
        organizer: props.annotationOrganizer,
        maxVisibleAnnotations: 50,
    });

    React.useEffect(
        function renderLoop() {
            let id: ReturnType<typeof requestAnimationFrame>;
            function render() {
                renderAnnotations();
                id = requestAnimationFrame(render);
            }

            id = requestAnimationFrame(render);

            return () => cancelAnimationFrame(id);
        },
        [renderAnnotations]
    );

    return <>{annotations}</>;
}
