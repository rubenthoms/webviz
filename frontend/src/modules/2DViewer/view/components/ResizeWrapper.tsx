import React from "react";

import { Layer as DeckGlLayer } from "@deck.gl/core";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { useElementSize } from "@lib/hooks/useElementSize";
import {
    ColorLegendsContainer,
    ColorLegendsContainerProps,
} from "@modules/_shared/components/ColorLegendsContainer/colorLegendsContainer";
import { ViewsType } from "@webviz/subsurface-viewer";

import { ReadoutWrapper, ViewportAnnotation } from "./ReadoutWrapper";

export type ViewportInfo = {
    id: string;
    color: string | null;
    name: string;
    colorLegend: ColorLegendsContainerProps;
};

export type ResizeWrapperProps = {
    numRows: number;
    views: ViewsType;
    viewportInfoArray: ViewportInfo[];
    isPending: boolean;
    layers: DeckGlLayer[];
    bounds?: [number, number, number, number];
};

export function ResizeWrapper(props: ResizeWrapperProps): React.ReactNode {
    const mainDivRef = React.useRef<HTMLDivElement>(null);
    const mainDivSize = useElementSize(mainDivRef);

    const viewportAnnotations: ViewportAnnotation[] = props.viewportInfoArray.map((annotation) => ({
        viewportId: annotation.id,
        content: (
            <>
                <ColorLegendsContainer
                    {...annotation.colorLegend}
                    height={((mainDivSize.height / 3) * 2) / props.numRows - 20}
                />
                <div className="font-bold text-lg flex gap-2 justify-center items-center">
                    <div className="flex gap-2 items-center bg-white p-2 backdrop-blur bg-opacity-50 rounded">
                        <div
                            className="rounded-full h-3 w-3 border border-white"
                            style={{ backgroundColor: annotation.color ?? undefined }}
                        />
                        <div className="">{annotation.name}</div>
                    </div>
                </div>
            </>
        ),
    }));

    return (
        <div ref={mainDivRef} className="relative w-full h-full flex flex-col">
            <PendingWrapper isPending={props.isPending}>
                <div style={{ height: mainDivSize.height, width: mainDivSize.width }}>
                    <ReadoutWrapper {...props} viewportAnnotations={viewportAnnotations} />
                </div>
            </PendingWrapper>
        </div>
    );
}
