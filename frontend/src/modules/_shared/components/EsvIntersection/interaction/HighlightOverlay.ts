import { Controller, OnRescaleEvent } from "@equinor/esv-intersection";

import { isEqual } from "lodash";

import { HighlightItem, Shape } from "./types";

export class HighlightOverlay {
    private _container: HTMLElement;
    private _controller: any;
    private _controllerOriginalRescaleFunction: any;
    private _indicatorOverlay: HTMLElement;
    private _pointerDown: boolean = false;
    private _highlightItems: HighlightItem[] = [];

    constructor(container: HTMLElement, controller: Controller) {
        this._container = container;
        this._controller = controller;
        this._controllerOriginalRescaleFunction = controller.zoomPanHandler.onRescale;

        this.makeIndicatorOverlay();
        this.makeEventHandlers();

        this._indicatorOverlay = this.makeIndicatorOverlay();
    }

    setHighlightObjects(highlightItems: HighlightItem[]) {
        this._highlightItems = highlightItems;
        if (this._highlightItems.length === 0) {
            this.changeVisibility(false);
            return;
        }
        this.draw();
    }

    private draw() {
        const { height, width, xScale, yScale } = this._controller.currentStateAsEvent;

        this._indicatorOverlay.style.width = `${width}px`;
        this._indicatorOverlay.style.height = `${height}px`;

        this._indicatorOverlay.innerHTML = "";

        const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgLayer.style.width = "100%";
        svgLayer.style.height = "100%";

        for (const item of this._highlightItems) {
            if (item.shape === Shape.POINT) {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", xScale(item.point[0]).toString());
                circle.setAttribute("cy", yScale(item.point[1]).toString());
                circle.setAttribute("r", "5");
                circle.setAttribute("fill", item.color);
                svgLayer.appendChild(circle);
            }
            if (item.shape === Shape.LINE) {
                if (isEqual(item.line[0], item.line[1])) {
                    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                    circle.setAttribute("cx", xScale(item.line[0][0]).toString());
                    circle.setAttribute("cy", yScale(item.line[0][1]).toString());
                    circle.setAttribute("r", "5");
                    circle.setAttribute("fill", item.color);
                    svgLayer.appendChild(circle);
                    continue;
                }
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", xScale(item.line[0][0]).toString());
                line.setAttribute("y1", yScale(item.line[0][1]).toString());
                line.setAttribute("x2", xScale(item.line[1][0]).toString());
                line.setAttribute("y2", yScale(item.line[1][1]).toString());

                line.setAttribute("marker-start", "url(#arrow-start)");
                line.setAttribute("marker-end", "url(#arrow-end)");
                line.setAttribute("stroke", item.color);
                line.setAttribute("stroke-width", "2");
                svgLayer.appendChild(line);
            }
            if (item.shape === Shape.POLYGON) {
                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                const adjustedPoints = item.polygon.map((point) => {
                    return {
                        x: xScale(point[0]),
                        y: yScale(point[1]),
                    };
                });
                polygon.setAttribute("points", adjustedPoints.map((point) => `${point.x},${point.y}`).join(" "));
                polygon.setAttribute("style", `fill:${item.color};stroke:${item.color};stroke-width:2;`);
                svgLayer.appendChild(polygon);
            }
        }

        this._indicatorOverlay.appendChild(svgLayer);

        this.changeVisibility(true);
    }

    destroy() {
        this.removeEventHandlers();
        this._controller.overlay.remove("indicator-overlay");
    }

    private makeIndicatorOverlay(): HTMLElement {
        const overlay = this._controller.overlay.create("indicator-overlay");

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "100";

        return overlay;
    }

    private changeVisibility(visible: boolean) {
        this._indicatorOverlay.style.visibility = visible ? "visible" : "hidden";
    }

    private handlePointerMove() {
        if (!this._pointerDown) {
            return;
        }
        this.changeVisibility(false);
    }

    private handlePointerDown() {
        this._pointerDown = true;
    }

    private handlePointerUp() {
        this._pointerDown = false;
        this.changeVisibility(true);
    }

    private handleRescale(event: OnRescaleEvent) {
        this._indicatorOverlay.style.visibility = "hidden";
        this._controllerOriginalRescaleFunction(event);
    }

    private makeEventHandlers() {
        this._container.addEventListener("pointermove", this.handlePointerMove.bind(this));
        this._container.addEventListener("pointerdown", this.handlePointerDown.bind(this));
        this._container.addEventListener("pointerup", this.handlePointerUp.bind(this));
        this._controller.zoomPanHandler.onRescale = this.handleRescale.bind(this);
    }

    private removeEventHandlers() {
        this._container.removeEventListener("pointermove", this.handlePointerMove.bind(this));
        this._container.removeEventListener("pointerdown", this.handlePointerDown.bind(this));
        this._container.removeEventListener("pointerup", this.handlePointerUp.bind(this));
        this._controller.zoomPanHandler.onRescale = this._controllerOriginalRescaleFunction;
    }
}
