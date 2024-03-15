import {
    Controller,
    Layer,
    OnRescaleEvent,
    OverlayMouseMoveEvent,
    RescaleFunction,
    SchematicData,
    SchematicLayer,
    SurfaceData,
} from "@equinor/esv-intersection";
import { Point2D, pointDistance, vectorLength, vectorMultiplyWithScalar } from "@lib/utils/geometry";

import { PolylineIntersectionData } from "./layers/PolylineIntersectionLayer";
import { SurfaceStatisticalFanchartsData } from "./layers/SurfaceStatisticalFanchartCanvasLayer";

type DataType = number[][];

type IntersectionResult = {
    point: Point2D;
    distance: number;
    polygonIndex?: number;
    shape?: Point2D[];
    md?: number;
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
        if (this._data.length <= 20) {
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
        let nearestPoint = this._data[0];
        let smallestDistance = pointDistance(this._data[0], point);
        let nearestPointIndex = 0;

        for (let i = 1; i < this._data.length; i++) {
            const distance = pointDistance(this._data[i], point);
            if (distance < smallestDistance) {
                nearestPoint = this._data[i];
                smallestDistance = distance;
                nearestPointIndex = i;
            }
        }

        if (nearestPointIndex === 0) {
            return {
                nearestPoint,
                nearestPointDistance: smallestDistance,
                secondNearestPoint: this._data[1],
                secondNearestPointDistance: pointDistance(this._data[1], point),
            };
        }

        if (nearestPointIndex === this._data.length - 1) {
            return {
                nearestPoint,
                nearestPointDistance: smallestDistance,
                secondNearestPoint: this._data[this._data.length - 2],
                secondNearestPointDistance: pointDistance(this._data[this._data.length - 2], point),
            };
        }

        const nearestPointToPointVector = {
            x: point.x - nearestPoint.x,
            y: point.y - nearestPoint.y,
        };

        const candidateVector1 = {
            x: this._data[nearestPointIndex + 1].x - nearestPoint.x,
            y: this._data[nearestPointIndex + 1].y - nearestPoint.y,
        };

        const candidateVector2 = {
            x: this._data[nearestPointIndex - 1].x - nearestPoint.x,
            y: this._data[nearestPointIndex - 1].y - nearestPoint.y,
        };

        const scalarProduct1 =
            nearestPointToPointVector.x * candidateVector1.x + nearestPointToPointVector.y * candidateVector1.y;
        const scalarProduct2 =
            nearestPointToPointVector.x * candidateVector2.x + nearestPointToPointVector.y * candidateVector2.y;

        if (scalarProduct1 > 0 && scalarProduct2 > 0) {
            if (scalarProduct1 < scalarProduct2) {
                return {
                    nearestPoint,
                    nearestPointDistance: smallestDistance,
                    secondNearestPoint: this._data[nearestPointIndex + 1],
                    secondNearestPointDistance: pointDistance(this._data[nearestPointIndex + 1], point),
                };
            }
            return {
                nearestPoint,
                nearestPointDistance: smallestDistance,
                secondNearestPoint: this._data[nearestPointIndex - 1],
                secondNearestPointDistance: pointDistance(this._data[nearestPointIndex - 1], point),
            };
        }

        if (scalarProduct1 > 0) {
            return {
                nearestPoint,
                nearestPointDistance: smallestDistance,
                secondNearestPoint: this._data[nearestPointIndex + 1],
                secondNearestPointDistance: pointDistance(this._data[nearestPointIndex + 1], point),
            };
        }

        return {
            nearestPoint,
            nearestPointDistance: smallestDistance,
            secondNearestPoint: this._data[nearestPointIndex - 1],
            secondNearestPointDistance: pointDistance(this._data[nearestPointIndex - 1], point),
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

    calcIntersection(point: Point2D): IntersectionResult | null {
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
    POINT = "point",
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
    order?: number;
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

function isStatisticalFanchartsData(data: unknown): data is SurfaceStatisticalFanchartsData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fancharts" in data) || !Array.isArray(data.fancharts)) {
        return false;
    }

    return true;
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
                    order: layer.order,
                };
            }
            return {
                id: `${layer.id}-${index}`,
                type: ShapeType.POLYLINE,
                layerId: "",
                label: "",
                data: [],
                color: "red",
                order: layer.order,
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
                order: layer.order,
            };
            offsetU += uVectorLength;
            return sectionPolygons;
        });
        return polygons;
    }

    if (isStatisticalFanchartsData(layer.data)) {
        const shapes: Shape<ShapeType.POLYLINE>[] = [];
        for (const fanchart of layer.data.fancharts) {
            const color = fanchart.color;
            const data = fanchart.data;
            const label = fanchart.label;

            shapes.push({
                id: `${layer.id}-${label}-mean`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (mean)`,
                data: data.mean.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });

            shapes.push({
                id: `${layer.id}-${label}-min`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (min)`,
                data: data.min.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });

            shapes.push({
                id: `${layer.id}-${label}-max`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (max)`,
                data: data.max.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });

            shapes.push({
                id: `${layer.id}-${label}-p10`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (p10)`,
                data: data.p10.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });

            shapes.push({
                id: `${layer.id}-${label}-p90`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (p90)`,
                data: data.p90.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });

            shapes.push({
                id: `${layer.id}-${label}-p50`,
                type: ShapeType.POLYLINE,
                layerId: layer.id,
                label: `${label} (p50)`,
                data: data.p50.map((point) => ({ x: point[0], y: point[1] })),
                color,
                order: layer.order,
            });
        }
        return shapes;
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
                order: layer.order,
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
    order?: number;
};

const POINTER_DISTANCE_THRESHOLD_PX = 10;

type Schematic = {
    label: string;
    startMd: number;
    endMd: number;
};

export class InteractionHandler {
    private _shapes: Map<string, Map<string, Shape<ShapeType>>> = new Map();
    private _boundingHandlers: Map<string, Map<string, BoundingHandler>> = new Map();
    private _schematics: Schematic[] = [];
    private _container: HTMLDivElement;
    private _controller: Controller;
    private _indicatorOverlay: HTMLElement;
    private _readoutOverlay: HTMLElement;
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
        if (layer instanceof SchematicLayer) {
            const data = layer.data as SchematicData;
            for (const perforation of data.perforations) {
                this._schematics.push({ label: "Perforation", startMd: perforation.start, endMd: perforation.end });
            }
        }
    }

    hasLayer(layerId: string) {
        return this._boundingHandlers.has(layerId);
    }

    updateLayer(layer: Layer<DataType>) {
        this.removeLayer(layer.id);
        this.makeBoundingHandler(layer);
    }

    removeLayer(layerId: string) {
        this._boundingHandlers.delete(layerId);
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
                boundingHandlers.set(el.id, new LineBoundingHandler(el.data as Point2D[], 10));
            }
        }
        // this.makePolygonDebugLayer(polygons);
        this._boundingHandlers.set(layer.id, boundingHandlers);
        this._shapes.set(layer.id, shapes);
    }

    private calcWellborePathIntersection(event: OverlayMouseMoveEvent<Controller>): IntersectionResult | null {
        const { target, caller, x, y } = event;
        const referenceSystem = caller.referenceSystem;

        if (!referenceSystem || !(target instanceof HTMLElement)) {
            return null;
        }

        const displacement = caller.currentStateAsEvent.xScale.invert(x);
        const tvd = caller.currentStateAsEvent.yScale.invert(y);

        if (!displacement || !caller?.referenceSystem) {
            return null;
        }

        const { curtain } = caller.referenceSystem.interpolators;
        const { minX, maxX } = curtain;
        const { min, max } = curtain.getBoundingBox(0, 1);
        const boundingBox = new BoundingBox2D({ x: min[0], y: min[1] }, { x: max[0], y: max[1] });
        if (!boundingBox.contains({ x: displacement, y: tvd })) {
            return null;
        }

        if (displacement > maxX && displacement < minX && displacement > 0 && maxX < 1000) {
            return null;
        }

        const targetDims = [displacement, tvd];

        const nearestPoint = curtain.getNearestPosition(targetDims);
        const md = curtain.getArcLength(1 - nearestPoint.u) + caller.referenceSystem.offset;

        return {
            point: { x: nearestPoint.point[0], y: nearestPoint.point[1] },
            distance: nearestPoint.distance,
            md,
        };
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

        let nearestIntersection: Intersection | null = null;

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

                if (
                    nearestIntersection === null ||
                    intersection.distance < nearestIntersection.distance ||
                    (intersection.distance === nearestIntersection.distance &&
                        (nearestIntersection.order ?? 0) < (shape.order ?? 0))
                ) {
                    if (shape.type === ShapeType.POLYLINE) {
                        nearestIntersection = {
                            shapeType: shape.type,
                            layerId: shape.layerId,
                            color: shape.color as string,
                            label: shape.label,
                            order: shape.order,
                            ...intersection,
                        };
                    } else if (shape.type === ShapeType.POLYGON) {
                        nearestIntersection = {
                            shapeType: shape.type,
                            layerId: shape.layerId,
                            order: shape.order,
                            color: "blue",
                            label: `Cellindex: ${(shape.data as PolygonData).polySourceCellIndicesArr[
                                intersection.polygonIndex as number
                            ].toString()}<br>Property value: ${(shape.data as PolygonData).polyPropsArr[
                                intersection.polygonIndex as number
                            ].toFixed(2)}`,
                            ...intersection,
                        };
                    }
                }
            }
        }

        const wellborePathIntersection = this.calcWellborePathIntersection(event);

        if (wellborePathIntersection) {
            if (!nearestIntersection || wellborePathIntersection.distance <= nearestIntersection.distance + 3) {
                nearestIntersection = {
                    shapeType: ShapeType.POLYLINE,
                    layerId: "wellborepath",
                    color: "red",
                    label: this.makeWellborePathLabel(wellborePathIntersection),
                    ...wellborePathIntersection,
                };
            }
        }

        if (!nearestIntersection) {
            this.changeIndicatorVisibility(false);
            this.changeReadoutVisibility(false);
            return;
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

    private makeWellborePathLabel(intersection: IntersectionResult) {
        const schematicLabels: string[] = [];
        if (intersection.md) {
            for (const schematic of this._schematics) {
                if (schematic.startMd <= intersection.md && schematic.endMd >= intersection.md) {
                    schematicLabels.push(
                        `${schematic.label} (${schematic.startMd.toFixed(2)} - ${schematic.endMd.toFixed(2)})`
                    );
                }
            }
        }
        return `Wellbore path<br>Md: ${intersection.md?.toFixed(2) ?? "N/A"}${
            schematicLabels.length > 0 ? "<br>" + schematicLabels.join("<br>") : ""
        }`;
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

        if (intersection.shapeType === ShapeType.POLYLINE) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", xScale(intersection.point.x).toString());
            circle.setAttribute("cy", yScale(intersection.point.y).toString());
            circle.setAttribute("r", "5");
            circle.setAttribute("fill", intersection.color);
            svgLayer.appendChild(circle);
        }

        if (intersection.shapeType === ShapeType.POLYGON && intersection.shape !== undefined) {
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

    private handlePointerMove() {
        if (!this._pointerDown) {
            return;
        }
        this._showIndicator = false;
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
