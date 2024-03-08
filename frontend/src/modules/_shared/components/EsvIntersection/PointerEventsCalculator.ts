import { Controller, Layer, OnRescaleEvent, OverlayMouseMoveEvent, RescaleFunction } from "@equinor/esv-intersection";
import {
    Point2D,
    Vector2D,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    vectorLength,
    vectorMultiplyWithScalar,
    vectorSum,
} from "@lib/utils/geometry";

type DataType = number[][];

class BoundingBox2D {
    private _minPoint: Point2D;
    private _maxPoint: Point2D;

    constructor(minVector: Point2D, maxVector: Point2D) {
        this._minPoint = minVector;
        this._maxPoint = maxVector;
    }

    getMin() {
        return this._minPoint;
    }

    getMax() {
        return this._maxPoint;
    }

    contains(point: Point2D): boolean {
        return (
            this._minPoint.x <= point.x &&
            this._maxPoint.x >= point.x &&
            this._minPoint.y <= point.y &&
            this._maxPoint.y >= point.y
        );
    }
}

class BoundingBoxTree {
    private _boundingBox: BoundingBox2D;
    private _data: Point2D[];
    private _children: BoundingBoxTree[] = [];

    constructor(data: Point2D[], margin: number = 0) {
        this._data = data;
        this._boundingBox = this.calcBoundingBox(data, margin);
        this.makeChildren(margin);
    }

    private calcBoundingBox(data: Point2D[], margin: number): BoundingBox2D {
        if (data.length === 0) {
            throw "You have to provide data";
        }

        let minX = data[0].x;
        let maxX = data[0].x;
        let minY = data[0].y;
        let maxY = data[0].y;

        for (const point of data) {
            if (point.x < minX) {
                minX = point.x;
            }
            if (point.x > maxX) {
                maxX = point.x;
            }
            if (point.y < minY) {
                minY = point.y;
            }
            if (point.y > maxY) {
                maxY = point.y;
            }
        }

        const minVector = { x: minX - margin, y: minY - margin };
        const maxVector = { x: maxX + margin, y: maxY + margin };

        return new BoundingBox2D(minVector, maxVector);
    }

    private makeChildren(margin: number) {
        if (this._data.length <= 100) {
            return;
        }

        const middleIndex = Math.floor(this._data.length / 2);
        const leftData = this._data.slice(0, middleIndex - 1);
        const rightData = this._data.slice(middleIndex, this._data.length);

        this._children.push(new BoundingBoxTree(leftData, margin));
        this._children.push(new BoundingBoxTree(rightData, margin));
    }

    getBoundingBox(): BoundingBox2D {
        return this._boundingBox;
    }

    getChildren(): BoundingBoxTree[] {
        return this._children;
    }

    private findNearestPoints(point: Point2D): {
        nearestPoint: Point2D;
        nearestPointDistance: number;
        secondNearestPoint: Point2D;
        secondNearestPointDistance: number;
    } {
        const nearestPoints: { point: Point2D; distance: number }[] = [];

        for (let i = 1; i < this._data.length; i++) {
            const distance = pointDistance(this._data[i], point);
            if (nearestPoints.length < 2 || distance < nearestPoints[0].distance) {
                nearestPoints.unshift({ point: this._data[i], distance: distance });
                if (nearestPoints.length > 2) {
                    nearestPoints.pop();
                }
            }
        }

        return {
            nearestPoint: nearestPoints[0].point,
            nearestPointDistance: nearestPoints[0].distance,
            secondNearestPoint: nearestPoints[1].point,
            secondNearestPointDistance: nearestPoints[1].distance,
        };
    }

    private interpolateData(point: Point2D): { point: Point2D; distance: number } {
        const nearestPoints = this.findNearestPoints(point);

        const nearestPointToPointVector = {
            x: point.x - nearestPoints.nearestPoint.x,
            y: point.y - nearestPoints.nearestPoint.y,
        };

        const nearestPointToSecondNearestPointVector = {
            x: nearestPoints.secondNearestPoint.x - nearestPoints.nearestPoint.x,
            y: nearestPoints.secondNearestPoint.y - nearestPoints.nearestPoint.y,
        };

        const scalarProduct =
            nearestPointToPointVector.x * nearestPointToSecondNearestPointVector.x +
            nearestPointToPointVector.y * nearestPointToSecondNearestPointVector.y;

        const result = vectorMultiplyWithScalar(
            nearestPointToSecondNearestPointVector,
            scalarProduct / vectorLength(nearestPointToSecondNearestPointVector) ** 2
        );

        const resultVector = {
            x: nearestPoints.nearestPoint.x + result.x,
            y: nearestPoints.nearestPoint.y + result.y,
        };
        return {
            point: resultVector,
            distance: pointDistance(resultVector, point),
        };
    }

    calcIntersection(point: Point2D): { point: Point2D; distance: number } | null {
        if (!this._boundingBox.contains(point)) {
            return null;
        }

        if (this._children.length === 0) {
            return this.interpolateData(point);
        }

        let intersection = this._children[0].calcIntersection(point);
        if (intersection === null) {
            intersection = this._children[1].calcIntersection(point);
        }

        return intersection;
    }
}

type Curve = {
    id: string;
    label: string;
    layerId: string;
    points: Point2D[];
    color: string;
};

function convertLayerDataToPoints(layer: Layer<unknown>): Curve[] {
    if (layer.data === undefined || layer.data === null) {
        return [];
    }

    if (typeof layer.data === "object" && "lines" in layer.data && Array.isArray(layer.data.lines)) {
        const pointsAndColor = layer.data.lines.map((line, index) => {
            if (Array.isArray(line.data)) {
                return {
                    id: line.id ?? `${layer.id}-${index}`,
                    layerId: layer.id,
                    label: line.label,
                    points: line.data.map((point: number[]) => ({ x: point[0], y: point[1] })),
                    color: line.color,
                };
            }
            return { id: `${layer.id}-${index}`, layerId: "", label: "", points: [], color: "red" };
        });
        return pointsAndColor;
    }

    if (Array.isArray(layer.data)) {
        return [
            {
                id: `${layer.id}`,
                layerId: layer.id,
                label: layer.id,
                points: layer.data.map((point) => ({ x: point[0], y: point[1] })),
                color: "red",
            },
        ];
    }

    throw new Error("Unsupported data format");
}

const POINTER_DISTANCE_THRESHOLD_PX = 10;

export class PointerEventsCalculator {
    private _layers: Layer<unknown>[] = [];
    private _curves: Map<string, Curve> = new Map();
    private _bbTrees: Map<string, BoundingBoxTree> = new Map();
    private _container: HTMLDivElement;
    private _controller: Controller;
    private _indicatorOverlay: HTMLElement;
    private _readoutOverlay: HTMLElement;
    private _mdReadoutOverlay: HTMLElement;
    private _wellborePathOverlay: HTMLElement;
    private _pointerDown: boolean = false;
    private _showIndicator: boolean = true;
    private _controllerOriginalRescaleFunction: RescaleFunction;

    constructor(container: HTMLDivElement, controller: Controller) {
        this._container = container;
        this._controller = controller;
        this._controllerOriginalRescaleFunction = controller.zoomPanHandler.onRescale;

        this.makeIndicatorOverlay();
        this.makeEventHandlers();

        this._indicatorOverlay = this.makeIndicatorOverlay();
        this._readoutOverlay = this.makeReadoutOverlay();
        this._mdReadoutOverlay = this.makeMdOverlay();
        this._wellborePathOverlay = this.makeWellborePathOverlay();
    }

    private makeIndicatorOverlay(): HTMLElement {
        const overlay = this._controller.overlay.create("indicator", {
            onMouseMove: this.handleMouseMove.bind(this),
        });

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.position = "absolute";
        overlay.style.top = "0px";
        overlay.style.left = "0px";
        overlay.style.width = "9px";
        overlay.style.height = "9px";
        overlay.style.pointerEvents = "none";
        overlay.style.borderRadius = "50%";
        overlay.style.visibility = "hidden";

        return overlay;
    }

    private makeMdOverlay(): HTMLElement {
        const overlay = this._controller.overlay.create("md");

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.width = "10rem";
        overlay.style.position = "absolute";
        overlay.style.right = "0";
        overlay.style.color = "white";
        overlay.style.visibility = "hidden";
        overlay.style.display = "flex";
        overlay.style.flexDirection = "column";
        overlay.style.borderRadius = "0.25rem";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.zIndex = "100";
        overlay.style.padding = "0.25rem";
        overlay.style.pointerEvents = "none";
        overlay.style.gap = "0.25rem";
        overlay.style.alignItems = "start";

        return overlay;
    }

    private makeWellborePathOverlay(): HTMLElement {
        const element = this._controller.overlay.create("wellborepath", {
            onMouseExit: (event) => {
                const { target } = event;

                if (!(target instanceof HTMLElement)) return;

                target.classList.replace("visible", "invisible");
            },
            onMouseMove: (event) => {
                const { target, caller, x, y } = event;
                const referenceSystem = caller.referenceSystem;

                if (!referenceSystem || !(target instanceof HTMLElement)) return;

                const displacement = caller.currentStateAsEvent.xScale.invert(x);
                if (displacement && caller?.referenceSystem) {
                    const { curtain } = caller.referenceSystem.interpolators;
                    const { minX, maxX } = curtain;
                    if ((displacement <= maxX && displacement >= minX) || (displacement < 0 && maxX >= 1000)) {
                        const tvd = caller.currentStateAsEvent.yScale.invert(y);

                        const targetDims = [displacement, tvd];

                        const nearestPoint = curtain.getNearestPosition(targetDims);
                        const md = nearestPoint.distance + caller.referenceSystem.offset;

                        const nearestPointToScreenX = caller.currentStateAsEvent.xScale(nearestPoint.point[0]);
                        const nearestPointToScreenY = caller.currentStateAsEvent.yScale(nearestPoint.point[1]);

                        const referenceSystemCoordinates = {
                            x: this._controller.currentStateAsEvent.xScale.invert(x),
                            y: this._controller.currentStateAsEvent.yScale.invert(y),
                        };

                        const newX = caller.currentStateAsEvent.xScale.invert(x);

                        if (
                            pointDistance({ x, y }, { x: nearestPointToScreenX, y: nearestPointToScreenY }) <
                            POINTER_DISTANCE_THRESHOLD_PX
                        ) {
                            target.style.visibility = "visible";
                            target.style.left = nearestPointToScreenX + "px";
                            target.style.top = nearestPointToScreenY + "px";
                            this.makeMdReadout(referenceSystemCoordinates, newX);
                            this.changeMdReadoutVisibility(true);
                        } else {
                            target.style.visibility = "hidden";
                            this.changeMdReadoutVisibility(false);
                        }

                        return;
                    }
                }

                target.style.visibility = "hidden";
                this.changeMdReadoutVisibility(false);
            },
        });

        if (!element) {
            throw new Error("Overlay not found");
        }

        element.classList.add(
            "absolute",
            "bg-red-500",
            "rounded-full",
            "w-[11px]",
            "h-[11px]",
            "block",
            "-ml-[5px]",
            "-mt-[5px]"
        );
        element.style.zIndex = "100";
        element.style.visibility = "hidden";

        return element;
    }

    private makeMdReadout(indicatorPoint: Point2D, md: number) {
        this._mdReadoutOverlay.innerHTML = `<span>MD: ${md.toFixed(2)}</span><span>${indicatorPoint.x.toFixed(
            2
        )}, ${indicatorPoint.y.toFixed(2)}</span>`;
    }

    private makeReadoutOverlay(): HTMLElement {
        const overlay = this._controller.overlay.create("readout");

        if (overlay === undefined) {
            throw new Error("Overlay not found");
        }

        overlay.style.width = "15rem";
        overlay.style.position = "absolute";
        overlay.style.color = "white";
        overlay.style.visibility = "hidden";
        overlay.style.display = "flex";
        overlay.style.borderRadius = "0.25rem";
        overlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
        overlay.style.zIndex = "100";
        overlay.style.padding = "0.25rem";
        overlay.style.pointerEvents = "none";
        overlay.style.gap = "0.75rem";
        overlay.style.alignItems = "center";

        return overlay;
    }

    destroy() {
        this.removeEventHandlers();
        this._controller.overlay.remove("indicator");
        this._controller.overlay.remove("readout");
    }

    addLayer(layer: Layer<DataType>) {
        this._layers.push(layer);
        this.makeBoundingBoxTree(layer);
    }

    removeLayer(layerId: string) {
        this._layers = this._layers.filter((l) => l.id !== layerId);
        this._bbTrees.delete(layerId);
    }

    private makeBoundingBoxTree(layer: Layer<DataType>) {
        const pointsAndColor = convertLayerDataToPoints(layer);
        for (const el of pointsAndColor) {
            if (el.points.length > 0) {
                this._curves.set(el.id, el);
                const boundingBoxTree = new BoundingBoxTree(el.points, 100);
                this._bbTrees.set(el.id, boundingBoxTree);
            }
        }
    }

    private handleMouseMove(event: OverlayMouseMoveEvent<Controller>) {
        const { x, y } = event;

        const pointerPosition = {
            x,
            y,
        };

        const referenceSystemCoordinates = {
            x: this._controller.currentStateAsEvent.xScale.invert(x),
            y: this._controller.currentStateAsEvent.yScale.invert(y),
        };

        let nearestIntersection: {
            layerId: string;
            color: string;
            label: string;
            point: Point2D;
            distance: number;
        } = {
            layerId: "",
            color: "",
            label: "",
            point: { x: 0, y: 0 },
            distance: Number.MAX_VALUE,
        };

        for (const id of this._curves.keys()) {
            const boundingBoxTree = this._bbTrees.get(id);
            const curve = this._curves.get(id);

            if (boundingBoxTree === undefined || curve === undefined) {
                continue;
            }

            const intersection = boundingBoxTree.calcIntersection(referenceSystemCoordinates);
            if (intersection === null) {
                continue;
            }

            if (intersection.distance < nearestIntersection.distance) {
                nearestIntersection = {
                    layerId: curve.layerId,
                    color: curve.color,
                    label: curve.label,
                    ...intersection,
                };
            }
        }

        const px = this._controller.currentStateAsEvent.xScale(nearestIntersection.point.x);
        const py = this._controller.currentStateAsEvent.yScale(nearestIntersection.point.y);

        if (pointDistance(pointerPosition, { x: px, y: py }) > POINTER_DISTANCE_THRESHOLD_PX) {
            this.changeIndicatorVisibility(false);
            this.changeReadoutVisibility(false);
            return;
        } else {
            this.changeIndicatorVisibility(true);
            this.changeReadoutVisibility(true);
        }

        this.drawIndicator(nearestIntersection.point, nearestIntersection.color);
        this.makeReadout(nearestIntersection.point, nearestIntersection.color, nearestIntersection.label);
    }

    private changeIndicatorVisibility(visible: boolean) {
        if (visible) {
            this._indicatorOverlay.style.visibility = "visible";
        } else {
            this._indicatorOverlay.style.visibility = "hidden";
        }
    }

    private drawIndicator(indicatorPoint: Point2D, color: string = "red") {
        if (!this._showIndicator) {
            return;
        }

        const px = this._controller.currentStateAsEvent.xScale(indicatorPoint.x);
        const py = this._controller.currentStateAsEvent.yScale(indicatorPoint.y);

        this._indicatorOverlay.style.visibility = "visible";
        this._indicatorOverlay.style.backgroundColor = color;
        this._indicatorOverlay.style.left = `${px - 5}px`;
        this._indicatorOverlay.style.top = `${py - 5}px`;
    }

    private makeReadout(indicatorPoint: Point2D, color: string, label: string) {
        this._readoutOverlay.innerHTML = `<span style="min-width: 1rem; min-height: 1rem; width: 1rem; height: 1rem; border-radius: 50%; display: inline-block; background-color: ${color};"></span><div style="display: flex; flex-direction: column; gap: 0.125rem; min-width: 0px; overflow: hidden"><span style="display: inline-block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label}</span>(${indicatorPoint.x.toFixed(
            2
        )}, ${indicatorPoint.y.toFixed(2)})</div>`;
    }

    private changeReadoutVisibility(visible: boolean) {
        if (visible) {
            this._readoutOverlay.style.visibility = "visible";
        } else {
            this._readoutOverlay.style.visibility = "hidden";
        }
    }

    private changeMdReadoutVisibility(visible: boolean) {
        if (visible) {
            this._mdReadoutOverlay.style.visibility = "visible";
        } else {
            this._mdReadoutOverlay.style.visibility = "hidden";
        }
    }

    private handlePointerMove() {
        if (!this._pointerDown) {
            return;
        }
        this._showIndicator = false;
        this._wellborePathOverlay.style.visibility = "hidden";
    }

    private handlePointerDown() {
        this._pointerDown = true;
    }

    private handlePointerUp() {
        this._pointerDown = false;
        this._showIndicator = true;
    }

    private handleRescale(event: OnRescaleEvent) {
        this._indicatorOverlay.style.visibility = "hidden";
        this._wellborePathOverlay.style.visibility = "hidden";
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
