import { Controller, Layer } from "@equinor/esv-intersection";

import { HighlightOverlay } from "./HighlightOverlay";
import { IntersectionHandler, IntersectionHandlerOptions, IntersectionHandlerTopic } from "./IntersectionHandler";
import { ReadoutOverlay } from "./ReadoutOverlay";
import { HighlightObject, IntersectionResult, LayerDataObject, ReadoutObject, Shape } from "./types";

import { makeHighlightObjectFromIntersectionResult } from "../utils/intersectionConversion";
import { makeLayerDataObjects } from "../utils/layerDataObjects";

export type InteractionHandlerOptions = {
    intersectionOptions: IntersectionHandlerOptions;
};

export class InteractionHandler {
    private _intersectionHandler: IntersectionHandler;
    private _highlightOverlay: HighlightOverlay;
    private _readoutOverlay: ReadoutOverlay;
    private _layerDataObjects: LayerDataObject[] = [];

    constructor(controller: Controller, container: HTMLElement, options: InteractionHandlerOptions) {
        this._intersectionHandler = new IntersectionHandler(controller, options.intersectionOptions);
        this._highlightOverlay = new HighlightOverlay(container, controller);
        this._readoutOverlay = new ReadoutOverlay(controller);

        this._intersectionHandler.subscribe(IntersectionHandlerTopic.INTERSECTION, this.handleIntersection.bind(this));
    }

    addLayer(layer: Layer<any>) {
        const layerDataObjects = makeLayerDataObjects(layer);
        for (const layerDataObject of layerDataObjects) {
            this._intersectionHandler.addIntersectionObject(layerDataObject.intersectionObject);
        }
        this._layerDataObjects.push(...layerDataObjects);
    }

    removeLayer(layerId: string) {
        const layerDataObjectsToRemove = this._layerDataObjects.filter(
            (layerDataObject) => layerDataObject.layerId === layerId
        );
        this._layerDataObjects = this._layerDataObjects.filter(
            (layerDataObject) => layerDataObject.layerId !== layerId
        );

        for (const layerDataObject of layerDataObjectsToRemove) {
            this._intersectionHandler.removeIntersectionObject(layerDataObject.id);
        }
    }

    destroy() {
        this._intersectionHandler.destroy();
        this._highlightOverlay.destroy();
    }

    private handleIntersection(payload: { intersections: { id: string; md: number; result: IntersectionResult }[] }) {
        const highlightItems: HighlightObject[] = [];
        const readoutItems: ReadoutObject[] = [];

        for (const intersection of payload.intersections) {
            const layerDataObject = this._layerDataObjects.find(
                (layerDataObject) => layerDataObject.id === intersection.id
            );
            if (layerDataObject) {
                const highlightItem = makeHighlightObjectFromIntersectionResult(
                    intersection.result,
                    layerDataObject.color,
                    layerDataObject.label
                );
                highlightItems.push(highlightItem);

                const readoutItem: ReadoutObject = {
                    color: layerDataObject.color,
                    label: layerDataObject.label,
                    md: layerDataObject.isWellbore ? intersection.md : undefined,
                    polygonIndex:
                        "polygonIndex" in intersection.result
                            ? (intersection.result.polygonIndex as number)
                            : undefined,
                    point: intersection.result.point,
                };
                readoutItems.push(readoutItem);
            }
        }

        this._highlightOverlay.setHighlightObjects(highlightItems);
        this._readoutOverlay.makeReadout(readoutItems);
    }
}
