import { Controller, Layer } from "@equinor/esv-intersection";
import {
    Point2D,
    pointDistance,
    pointRelativeToDomRect,
    pointerEventToPoint,
    vectorMultiplyWithScalar,
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

    constructor(data: Point2D[]) {
        this._data = data;
        this._boundingBox = this.calcBoundingBox(data);
        this.makeChildren();
    }

    private calcBoundingBox(data: Point2D[]): BoundingBox2D {
        if (data.length === 0) {
            return new BoundingBox2D({ x: 0, y: 0 }, { x: 0, y: 0 });
        }
        const firstDataPoint = data[0];
        const lastDataPoint = data[data.length - 1];

        const minVector = {
            x: Math.min(firstDataPoint.x, lastDataPoint.x),
            y: Math.min(firstDataPoint.y, lastDataPoint.y),
        };
        const maxVector = {
            x: Math.max(firstDataPoint.x, lastDataPoint.x),
            y: Math.max(firstDataPoint.y, lastDataPoint.y),
        };

        return new BoundingBox2D(minVector, maxVector);
    }

    private makeChildren() {
        if (this._data.length <= 1000) {
            return;
        }

        const middleIndex = Math.floor(this._data.length / 2);
        const leftData = this._data.slice(0, middleIndex);
        const rightData = this._data.slice(middleIndex, this._data.length);

        this._children.push(new BoundingBoxTree(leftData));
        this._children.push(new BoundingBoxTree(rightData));
    }

    getBoundingBox(): BoundingBox2D {
        return this._boundingBox;
    }

    getChildren(): BoundingBoxTree[] {
        return this._children;
    }

    private findNearestPoints(point: Point2D): { nearestPoint: Point2D; secondNearestPoint: Point2D } {
        const nearestPoints: { point: Point2D; distance: number }[] = [];

        for (let i = 1; i < this._data.length; i++) {
            const distance = pointDistance(this._data[i], point);
            if (nearestPoints.length === 0 || distance < nearestPoints[0].distance) {
                nearestPoints.unshift({ point: this._data[i], distance: distance });
                if (nearestPoints.length > 2) {
                    nearestPoints.pop();
                }
            }
        }

        return {
            nearestPoint: nearestPoints[0].point,
            secondNearestPoint: nearestPoints[1].point,
        };
    }

    private interpolateData(point: Point2D): Point2D {
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
        const result = vectorMultiplyWithScalar(nearestPointToSecondNearestPointVector, scalarProduct);
        return { x: nearestPoints.nearestPoint.x + result.x, y: nearestPoints.nearestPoint.y + result.y };
    }

    calcIntersection(point: Point2D): Point2D | null {
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

function convertLayerDataToPoints(layer: Layer<unknown>): Point2D[] {
    if (layer.data === undefined || layer.data === null) {
        return [];
    }

    if (typeof layer.data === "object" && "lines" in layer.data && Array.isArray(layer.data.lines)) {
        if (layer.data.lines.length > 0 && Array.isArray(layer.data.lines[0].data)) {
            return layer.data.lines[0].data.map((point: number[]) => ({ x: point[0], y: point[1] }));
        }
    }

    if (Array.isArray(layer.data)) {
        return layer.data.map((point) => ({ x: point[0], y: point[1] }));
    }

    throw new Error("Unsupported data format");
}

// Working name
export class PointerEventsCalculator {
    private _layers: Layer<unknown>[] = [];
    private _bbTrees: Map<string, BoundingBoxTree> = new Map();
    private _container: HTMLDivElement;
    private _controller: Controller;

    constructor(container: HTMLDivElement, controller: Controller) {
        this._container = container;
        this._controller = controller;
        this.makeEventHandlers();
    }

    destroy() {
        this.removeEventHandlers();
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
        const points = convertLayerDataToPoints(layer);
        const boundingBoxTree = new BoundingBoxTree(points);
        this._bbTrees.set(layer.id, boundingBoxTree);

        const overlay = document.getElementById("overlay");

        if (!overlay) {
            throw new Error("Overlay not found");
        }

        const oldContainer = document.getElementById(`bb-${layer.id}`);
        if (oldContainer !== null) {
            overlay.removeChild(oldContainer);
        }

        const wrapper = document.createElement("div");
        wrapper.id = `bb-${layer.id}`;
        wrapper.style.position = "absolute";
        wrapper.style.top = "0px";
        wrapper.style.left = "0px";
        wrapper.style.width = "100%";
        wrapper.style.height = "100%";
        overlay.appendChild(wrapper);

        let currentBoundingBoxTree = boundingBoxTree;
        while (currentBoundingBoxTree.getChildren().length > 0) {
            const boundingBoxMin = currentBoundingBoxTree.getBoundingBox().getMin();
            const boundingBoxMax = currentBoundingBoxTree.getBoundingBox().getMax();

            const pxLeft = this._controller.currentStateAsEvent.xScale(boundingBoxMin.x);
            const pxTop = this._controller.currentStateAsEvent.yScale(boundingBoxMin.y);
            const pxRight = this._controller.currentStateAsEvent.xScale(boundingBoxMax.x);
            const pxBottom = this._controller.currentStateAsEvent.yScale(boundingBoxMax.y);

            const div = document.createElement("div");
            div.style.border = "1px solid red";
            div.style.position = "absolute";
            div.style.left = pxLeft + "px";
            div.style.top = pxTop + "px";
            div.style.width = pxRight - pxLeft + "px";
            div.style.height = pxBottom - pxTop + "px";

            wrapper.appendChild(div);
            currentBoundingBoxTree = currentBoundingBoxTree.getChildren()[0];
        }

        currentBoundingBoxTree = boundingBoxTree;
        while (currentBoundingBoxTree.getChildren().length > 0) {
            const boundingBoxMin = currentBoundingBoxTree.getBoundingBox().getMin();
            const boundingBoxMax = currentBoundingBoxTree.getBoundingBox().getMax();

            const pxLeft = this._controller.currentStateAsEvent.xScale(boundingBoxMin.x);
            const pxTop = this._controller.currentStateAsEvent.yScale(boundingBoxMin.y);
            const pxRight = this._controller.currentStateAsEvent.xScale(boundingBoxMax.x);
            const pxBottom = this._controller.currentStateAsEvent.yScale(boundingBoxMax.y);

            const div = document.createElement("div");
            div.style.border = "1px solid red";
            div.style.position = "absolute";
            div.style.left = pxLeft + "px";
            div.style.top = pxTop + "px";
            div.style.width = pxRight - pxLeft + "px";
            div.style.height = pxBottom - pxTop + "px";

            wrapper.appendChild(div);
            currentBoundingBoxTree = currentBoundingBoxTree.getChildren()[1];
        }
    }

    private onPointerMove(event: PointerEvent) {
        const pointerPosition = pointRelativeToDomRect(
            pointerEventToPoint(event),
            this._container.getBoundingClientRect()
        );

        const referenceSystemCoordinates = {
            x: this._controller.currentStateAsEvent.xScale.invert(pointerPosition.x),
            y: this._controller.currentStateAsEvent.yScale.invert(pointerPosition.y),
        };

        console.debug("Reference system coordinates", referenceSystemCoordinates);

        // Check intersection
        for (const layer of this._layers) {
            const boundingBoxTree = this._bbTrees.get(layer.id);

            if (boundingBoxTree === undefined) {
                continue;
            }

            const intersection = boundingBoxTree.calcIntersection(referenceSystemCoordinates);
            if (intersection === null) {
                continue;
            }

            // Emit intersection event
            console.debug("Intersection", intersection);
        }
    }

    private makeEventHandlers() {
        this._container.addEventListener("pointermove", this.onPointerMove.bind(this));
    }

    private removeEventHandlers() {
        this._container.removeEventListener("pointermove", this.onPointerMove.bind(this));
    }
}
