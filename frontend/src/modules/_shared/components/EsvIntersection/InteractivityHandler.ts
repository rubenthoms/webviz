import {
    Controller,
    Layer,
    OnRescaleEvent,
    OverlayMouseMoveEvent,
    RescaleFunction,
    SurfaceData,
} from "@equinor/esv-intersection";
import { Point2D, pointDistance, vectorLength, vectorMultiplyWithScalar } from "@lib/utils/geometry";

import { PolylineIntersectionData } from "./PolylineIntersectionLayer";

type DataType = number[][];

interface BoundingVolume {
    contains(point: Point2D): boolean;
}

class BoundingBox2D implements BoundingVolume {
    private _minPoint: Point2D;
    private _maxPoint: Point2D;

    constructor(minVector: Point2D, maxVector: Point2D) {
        this._minPoint = minVector;
        this._maxPoint = maxVector;
    }

    getMinPoint(): Point2D {
        return this._minPoint;
    }

    getMaxPoint(): Point2D {
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

class BoundingSphere2D implements BoundingVolume {
    private _center: Point2D;
    private _radius: number;

    constructor(center: Point2D, radius: number) {
        this._center = center;
        this._radius = radius;
    }

    getCenter(): Point2D {
        return this._center;
    }

    getRadius(): number {
        return this._radius;
    }

    contains(point: Point2D): boolean {
        return pointDistance(this._center, point) <= this._radius;
    }
}

type IntersectionResult = {
    point: Point2D;
    distance: number;
    polygonIndex?: number;
    shape?: Point2D[];
};

interface BoundingHandler {
    calcIntersection(point: Point2D): IntersectionResult | null;
}

class LineBoundingHandler implements BoundingHandler {
    private _boundingBox: BoundingBox2D;
    private _data: Point2D[];
    private _children: LineBoundingHandler[] = [];

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

        this._children.push(new LineBoundingHandler(leftData, margin));
        this._children.push(new LineBoundingHandler(rightData, margin));
    }

    getBoundingBox(): BoundingBox2D {
        return this._boundingBox;
    }

    getChildren(): LineBoundingHandler[] {
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

class BoundingGrid {
    private _sectors: number[] = [];
    private _sectorIndices: number[] = [];
    private _minX: number = Number.POSITIVE_INFINITY;
    private _maxX: number = Number.NEGATIVE_INFINITY;

    private _sectorSize: number;

    constructor(sectorSize: number) {
        this._sectorSize = sectorSize;
    }

    getAndMaybeMakeSector(point: Point2D): number {
        if (this._sectors.length === 0) {
            this._minX = point.x;
            this._maxX = point.x + this._sectorSize;
            this._sectors.push(point.x);
            this._sectorIndices.push(0);
            return 0;
        }

        if (point.x < this._minX) {
            const numColumns = Math.ceil((this._minX - point.x) / this._sectorSize);
            this.prependColumns(numColumns);
            const sectorIndex = this._sectors.length - 1;
            return sectorIndex;
        }

        if (point.x > this._maxX) {
            const numColumns = Math.ceil((point.x - this._maxX) / this._sectorSize);
            this.appendColumns(numColumns);
            const sectorIndex = this._sectors.length - 1;
            return sectorIndex;
        }

        const sectorIndex = this.getIntersectedSector(point);
        if (sectorIndex === null) {
            throw "Expect to always find a sector since it should otherwise be created";
        }

        return sectorIndex;
    }

    private prependColumns(numColumns: number) {
        for (let i = 0; i < numColumns; i++) {
            this._sectors.unshift(this._minX - this._sectorSize * i);
            this._sectorIndices.unshift(i);
        }
        this._minX -= this._sectorSize * numColumns;
    }

    private appendColumns(numColumns: number) {
        for (let i = 0; i < numColumns; i++) {
            this._sectors.push(this._maxX - this._sectorSize * i);
            this._sectorIndices.push(this._sectors.length - 1);
        }
        this._maxX += this._sectorSize * numColumns;
    }

    getIntersectedSector(point: Point2D): number | null {
        const sectorIndex = Math.floor((point.x - this._minX) / this._sectorSize);
        if (sectorIndex < 0 || sectorIndex >= this._sectors.length) {
            return null;
        }

        return this._sectorIndices[sectorIndex];
    }
}

function makeBoundingSphereFromPolygon(polygon: Point2D[]): BoundingSphere2D {
    const center = { x: 0, y: 0 };

    const xValues = polygon.map((point) => point.x);
    const yValues = polygon.map((point) => point.y);

    const xMax = Math.max(...xValues);
    const xMin = Math.min(...xValues);
    const yMax = Math.max(...yValues);
    const yMin = Math.min(...yValues);

    center.x = xMin + (xMax - xMin) / 2;
    center.y = yMin + (yMax - yMin) / 2;

    const radius = Math.sqrt((center.x - xMin) ** 2 + (center.y - yMin) ** 2);

    return new BoundingSphere2D(center, radius);
}

function pointIsInPolygon(
    point: Point2D,
    startOffset: number,
    vertices: Float32Array,
    polygonIndices: Uint32Array
): boolean {
    const numVertices = polygonIndices.length;
    const x = point.x;
    const y = point.y;
    let inside = false;

    let p1 = {
        x: startOffset + vertices[polygonIndices[0] * 2],
        y: vertices[polygonIndices[0] * 2 + 1],
    };
    let p2 = {
        x: 0,
        y: 0,
    };
    for (let i = 1; i <= numVertices; i++) {
        const idx = i % numVertices;
        p2 = {
            x: startOffset + vertices[polygonIndices[idx] * 2],
            y: vertices[polygonIndices[idx] * 2 + 1],
        };

        if (y > Math.min(p1.y, p2.y)) {
            if (y <= Math.max(p1.y, p2.y)) {
                if (x <= Math.max(p1.x, p2.x)) {
                    const xIntersection = ((y - p1.y) * (p2.x - p1.x)) / (p2.y - p1.y) + p1.x;
                    if (p1.x === p2.x || x <= xIntersection) {
                        inside = !inside;
                    }
                }
            }
        }

        p1 = p2;
    }

    return inside;
}

function polygonFromVerticesAndIndices(startOffset: number, vertices: Float32Array, indices: Uint32Array): Point2D[] {
    const polygon: Point2D[] = [];
    for (let i = 0; i < indices.length; i++) {
        polygon.push({ x: startOffset + vertices[indices[i] * 2], y: vertices[indices[i] * 2 + 1] });
    }
    return polygon;
}

class PolygonBoundingHandler implements BoundingHandler {
    private _boundingBox: BoundingBox2D;
    private _data: PolygonData;

    constructor(data: PolygonData) {
        this._data = data;
        this._boundingBox = new BoundingBox2D({ x: data.startU, y: data.minZ }, { x: data.endU, y: data.maxZ });
    }

    calcIntersection(point: Point2D): IntersectionResult | null {
        if (!this._boundingBox.contains(point)) {
            return null;
        }

        let idx = 0;
        let polygonIndex = 0;
        while (idx < this._data.polygons.length) {
            const numVertices = this._data.polygons[idx];
            const polygonIndices = this._data.polygons.subarray(idx + 1, idx + numVertices + 1);
            if (pointIsInPolygon(point, this._data.startU, this._data.vertices, polygonIndices)) {
                return {
                    point,
                    distance: 0,
                    polygonIndex,
                    shape: polygonFromVerticesAndIndices(this._data.startU, this._data.vertices, polygonIndices),
                };
            }
            idx += numVertices + 1;
            polygonIndex++;
        }

        return null;
    }
}

enum ShapeType {
    POLYLINE = "polyline",
    POLYGON = "polygon",
}

type PolygonData = {
    vertices: Float32Array;
    polygons: Uint32Array;
    polySourceCellIndicesArr: Uint32Array;
    polyPropsArr: Float32Array;
    minZ: number;
    maxZ: number;
    startU: number;
    endU: number;
};

type Shape<T extends ShapeType> = {
    id: string;
    label: string;
    layerId: string;
    type: T;
    data: T extends ShapeType.POLYLINE ? Point2D[] : PolygonData;
    color?: T extends ShapeType.POLYLINE ? string : never;
};

function isSurfaceData(data: unknown): data is SurfaceData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("lines" in data) || !Array.isArray(data.lines)) {
        return false;
    }

    return true;
}

function isPolylineIntersectionData(data: unknown): data is PolylineIntersectionData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fenceMeshSections" in data) || !Array.isArray(data.fenceMeshSections)) {
        return false;
    }

    return true;
}

function makePolygonsFromVerticesAndIndices(startU: number, vertices: Float32Array, indices: Uint32Array): Point2D[][] {
    const polygons: Point2D[][] = [];
    let idx = 0;
    while (idx < indices.length) {
        const numVertices = indices[idx];
        const polygon: Point2D[] = [];
        for (let i = 1; i <= numVertices; i++) {
            const vertexIndex = indices[idx + i];
            polygon.push({ x: startU + vertices[vertexIndex * 2], y: vertices[vertexIndex * 2 + 1] });
        }
        idx += numVertices + 1;
        polygons.push(polygon);
    }
    return polygons;
}

function convertLayerDataToShapeObjects(layer: Layer<unknown>): Shape<ShapeType>[] {
    if (layer.data === undefined || layer.data === null) {
        return [];
    }

    if (isSurfaceData(layer.data)) {
        const pointsAndColor = layer.data.lines.map((line, index) => {
            if (Array.isArray(line.data)) {
                return {
                    id: line.id ?? `${layer.id}-${index}`,
                    type: ShapeType.POLYLINE,
                    layerId: layer.id,
                    label: line.label,
                    data: line.data.map((point: number[]) => ({ x: point[0], y: point[1] })),
                    color: `${line.color}`,
                };
            }
            return {
                id: `${layer.id}-${index}`,
                type: ShapeType.POLYLINE,
                layerId: "",
                label: "",
                data: [],
                color: "red",
            };
        });
        return pointsAndColor;
    }

    if (isPolylineIntersectionData(layer.data)) {
        let offsetU = 0;
        const polygons = layer.data.fenceMeshSections.map((section, index) => {
            const uVectorLength = pointDistance(
                {
                    x: section.startUtmX,
                    y: section.startUtmY,
                },
                {
                    x: section.endUtmX,
                    y: section.endUtmY,
                }
            );
            const sectionPolygons = {
                id: `${layer.id}-${index}`,
                type: ShapeType.POLYGON,
                layerId: layer.id,
                label: `${layer.id}-${index}`,
                data: {
                    vertices: section.verticesUzArr,
                    polygons: section.polysArr,
                    polySourceCellIndicesArr: section.polySourceCellIndicesArr,
                    polyPropsArr: section.polyPropsArr,
                    minZ: section.minZ,
                    maxZ: section.maxZ,
                    startU: offsetU,
                    endU: offsetU + uVectorLength,
                },
            };
            offsetU += uVectorLength;
            return sectionPolygons;
        });
        return polygons;
    }

    if (Array.isArray(layer.data)) {
        return [
            {
                id: `${layer.id}`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: layer.id,
                data: layer.data.map((point) => ({ x: point[0], y: point[1] })),
                color: "red",
            },
        ];
    }

    return [];
}

type Intersection = {
    shapeType: ShapeType;
    layerId: string;
    color: string;
    label: string;
    point: Point2D;
    distance: number;
    polygonIndex?: number;
    shape?: Point2D[];
};

const POINTER_DISTANCE_THRESHOLD_PX = 10;

export class InteractivityHandler {
    private _shapes: Map<string, Map<string, Shape<ShapeType>>> = new Map();
    private _boundingHandlers: Map<string, Map<string, BoundingHandler>> = new Map();
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
        overlay.style.pointerEvents = "none";
        overlay.style.visibility = "hidden";
        overlay.style.zIndex = "100";

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
        this.makeBoundingHandler(layer);
    }

    removeLayer(layerId: string) {
        this._boundingHandlers.delete(layerId);
    }

    private makePolygonDebugLayer(polygons: Point2D[][]) {
        const { xScale, yScale, width, height } = this._controller.currentStateAsEvent;

        let svgOverlay: HTMLElement | undefined = this._controller.overlay.elements["svg-overlay"] as unknown as
            | HTMLElement
            | undefined;

        if (!svgOverlay) {
            svgOverlay = this._controller.overlay.create("svg-overlay") as HTMLElement;
            svgOverlay.style.zIndex = "99";
        }

        svgOverlay.innerHTML = "";

        const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgLayer.setAttribute("id", "svg-debug");
        svgLayer.style.width = width + "px";
        svgLayer.style.height = height + "px";
        svgLayer.style.pointerEvents = "none";

        for (const polygon of polygons) {
            const adjustedPoints = polygon.map((point) => {
                return {
                    x: xScale(point.x),
                    y: yScale(point.y),
                };
            });
            const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            poly.setAttribute("points", adjustedPoints.map((point) => `${point.x},${point.y}`).join(" "));
            poly.setAttribute("style", "fill:rgba(0,0,0,0.5);stroke:rgba(0,0,0,0.5);stroke-width:1;");
            svgLayer.appendChild(poly);
        }
        svgOverlay.appendChild(svgLayer);
    }

    private makeBoundingHandler(layer: Layer<DataType>) {
        const shape = convertLayerDataToShapeObjects(layer);
        const boundingHandlers = new Map<string, BoundingHandler>();
        const shapes = new Map<string, Shape<ShapeType>>();
        for (const el of shape) {
            shapes.set(el.id, el);
            if (el.type === ShapeType.POLYGON) {
                boundingHandlers.set(el.id, new PolygonBoundingHandler(el.data as PolygonData));
            } else {
                boundingHandlers.set(el.id, new LineBoundingHandler(el.data as Point2D[]));
            }
        }
        // this.makePolygonDebugLayer(polygons);
        this._boundingHandlers.set(layer.id, boundingHandlers);
        this._shapes.set(layer.id, shapes);
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

        let nearestIntersection: Intersection = {
            shapeType: ShapeType.POLYLINE,
            layerId: "",
            color: "",
            label: "",
            point: { x: 0, y: 0 },
            distance: Number.MAX_VALUE,
        };

        for (const layerId of this._shapes.keys()) {
            const boundingHandlers = this._boundingHandlers.get(layerId);
            const shapes = this._shapes.get(layerId);

            if (boundingHandlers === undefined || shapes === undefined) {
                continue;
            }

            for (const [id, boundingHandler] of boundingHandlers.entries()) {
                const shape = shapes.get(id);

                if (shape === undefined) {
                    continue;
                }

                const intersection = boundingHandler.calcIntersection(referenceSystemCoordinates);
                if (intersection === null) {
                    continue;
                }

                if (intersection.distance < nearestIntersection.distance) {
                    if (shape.type === ShapeType.POLYLINE) {
                        nearestIntersection = {
                            shapeType: shape.type,
                            layerId: shape.layerId,
                            color: shape.color as string,
                            label: shape.label,
                            ...intersection,
                        };
                    } else if (shape.type === ShapeType.POLYGON) {
                        nearestIntersection = {
                            shapeType: shape.type,
                            layerId: shape.layerId,
                            color: "blue",
                            label: `Cellindex: ${(shape.data as PolygonData).polySourceCellIndicesArr[
                                intersection.polygonIndex as number
                            ].toString()}<br />Property value: ${(shape.data as PolygonData).polyPropsArr[
                                intersection.polygonIndex as number
                            ].toFixed(2)}`,
                            ...intersection,
                        };
                    }
                }
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

        this.drawIndicator(nearestIntersection);
        this.makeReadout(nearestIntersection.point, nearestIntersection.color, nearestIntersection.label);
    }

    private changeIndicatorVisibility(visible: boolean) {
        if (visible) {
            this._indicatorOverlay.style.visibility = "visible";
        } else {
            this._indicatorOverlay.style.visibility = "hidden";
        }
    }

    private drawIndicator(intersection: Intersection) {
        if (!this._showIndicator) {
            return;
        }

        const { height, width, xScale, yScale } = this._controller.currentStateAsEvent;

        this._indicatorOverlay.style.width = `${width}px`;
        this._indicatorOverlay.style.height = `${height}px`;

        this._indicatorOverlay.innerHTML = "";

        const svgLayer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svgLayer.style.width = "100%";
        svgLayer.style.height = "100%";

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", xScale(intersection.point.x).toString());
        circle.setAttribute("cy", yScale(intersection.point.y).toString());
        circle.setAttribute("r", "5");
        circle.setAttribute("fill", intersection.color);
        svgLayer.appendChild(circle);

        if (intersection.shape) {
            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            const adjustedPoints = intersection.shape.map((point) => {
                return {
                    x: xScale(point.x),
                    y: yScale(point.y),
                };
            });
            polygon.setAttribute("points", adjustedPoints.map((point) => `${point.x},${point.y}`).join(" "));
            polygon.setAttribute("style", "fill:rgba(0,0,255,0.2);stroke:rgba(0,0,255,1);stroke-width:2;");
            svgLayer.appendChild(polygon);
        }

        this._indicatorOverlay.appendChild(svgLayer);

        this._indicatorOverlay.style.visibility = "visible";
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
