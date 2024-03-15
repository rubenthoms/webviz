import { BoundingBox2D } from "./BoundingBox2D";
import { IntersectionCalculator, IntersectionResult, PolygonData, Shape } from "./types";

function pointIsInPolygon(
    point: number[],
    startOffset: number,
    vertices: Float32Array,
    polygonIndices: Uint32Array
): boolean {
    const numVertices = polygonIndices.length;
    const x = point[0];
    const y = point[1];
    let inside = false;

    let p1 = [startOffset + vertices[polygonIndices[0] * 2], vertices[polygonIndices[0] * 2 + 1]];
    let p2 = [0, 0];
    for (let i = 1; i <= numVertices; i++) {
        const idx = i % numVertices;
        p2 = [startOffset + vertices[polygonIndices[idx] * 2], vertices[polygonIndices[idx] * 2 + 1]];

        if (y > Math.min(p1[1], p2[1])) {
            if (y <= Math.max(p1[1], p2[1])) {
                if (x <= Math.max(p1[0], p2[0])) {
                    const xIntersection = ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0];
                    if (p1[0] === p2[0] || x <= xIntersection) {
                        inside = !inside;
                    }
                }
            }
        }

        p1 = p2;
    }

    return inside;
}

function polygonFromVerticesAndIndices(startOffset: number, vertices: Float32Array, indices: Uint32Array): number[][] {
    const polygon: number[][] = [];
    for (let i = 0; i < indices.length; i++) {
        polygon.push([startOffset + vertices[indices[i] * 2], vertices[indices[i] * 2 + 1]]);
    }
    return polygon;
}

export interface PolygonIntersectionResult extends IntersectionResult {
    shape: Shape.POLYGON;
    polygon: number[][];
    polygonIndex: number;
}

export class PolygonIntersectionCalculator implements IntersectionCalculator {
    private _boundingBox: BoundingBox2D;
    private _data: PolygonData;

    constructor(data: PolygonData) {
        this._data = data;
        this._boundingBox = new BoundingBox2D([data.xMin, data.yMin], [data.xMax, data.yMax]);
    }

    calcIntersection(point: number[]): PolygonIntersectionResult | null {
        if (!this._boundingBox.contains(point)) {
            return null;
        }

        let idx = 0;
        let polygonIndex = 0;
        while (idx < this._data.polygons.length) {
            const numVertices = this._data.polygons[idx];
            const polygonIndices = this._data.polygons.subarray(idx + 1, idx + numVertices + 1);
            if (pointIsInPolygon(point, this._data.xMin, this._data.vertices, polygonIndices)) {
                return {
                    shape: Shape.POLYGON,
                    point,
                    polygonIndex,
                    polygon: polygonFromVerticesAndIndices(this._data.xMin, this._data.vertices, polygonIndices),
                };
            }
            idx += numVertices + 1;
            polygonIndex++;
        }

        return null;
    }
}
