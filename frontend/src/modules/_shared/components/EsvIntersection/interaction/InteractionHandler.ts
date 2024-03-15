import { Controller, OverlayMouseMoveEvent } from "@equinor/esv-intersection";

import { LineIntersectionCalculator } from "./LineIntersectionCalculator";
import { PointIntersectionCalculator } from "./PointIntersectionCalculator";
import { PolygonIntersectionCalculator } from "./PolygonIntersectionCalculator";
import { IntersectionCalculator, IntersectionObject, IntersectionResult, Shape } from "./types";

export type IntersectionHandlerOptions = {
    threshold?: number;
};

export class InteractionHandler {
    private _controller: Controller;
    private _options: IntersectionHandlerOptions;
    private _intersectionCalculators: Map<string, IntersectionCalculator> = new Map();
    onIntersection: ((id: string, intersection: IntersectionResult) => void) | null;

    constructor(controller: Controller, options?: IntersectionHandlerOptions) {
        this._controller = controller;
        this._options = options || { threshold: 10 };
        this.onIntersection = null;

        this.makeOverlay();
    }

    addIntersectionObject(intersectionObject: IntersectionObject) {
        switch (intersectionObject.shape) {
            case Shape.POINT:
                this._intersectionCalculators.set(
                    intersectionObject.id,
                    new PointIntersectionCalculator(intersectionObject.data, this._options.threshold)
                );
                break;
            case Shape.LINE:
                this._intersectionCalculators.set(
                    intersectionObject.id,
                    new LineIntersectionCalculator(intersectionObject.data, this._options.threshold)
                );
                break;
            case Shape.POLYGON:
                this._intersectionCalculators.set(
                    intersectionObject.id,
                    new PolygonIntersectionCalculator(intersectionObject.data)
                );
                break;
        }
    }

    removeIntersectionObject(id: string) {
        this._intersectionCalculators.delete(id);
    }

    private makeOverlay() {
        const overlay = this._controller.overlay.create("intersection-overlay", {
            onMouseMove: this.handleMouseMove.bind(this),
        });

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "100";
    }

    destroy() {
        this._controller.overlay.remove("intersection-overlay");
    }

    private handleMouseMove(event: OverlayMouseMoveEvent<Controller>) {
        const { x, y } = event;

        const referenceSystemCoordinates = [
            this._controller.currentStateAsEvent.xScale.invert(x),
            this._controller.currentStateAsEvent.yScale.invert(y),
        ];

        for (const [id, calculator] of this._intersectionCalculators) {
            const intersection = calculator.calcIntersection(referenceSystemCoordinates);
            if (intersection) {
                this.onIntersection?.(id, intersection);
            }
        }
    }
}
