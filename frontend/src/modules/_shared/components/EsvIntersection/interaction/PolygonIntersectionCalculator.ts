import { IntersectionCalculator, IntersectionResult, Shape } from "./types";

function pointIsInPolygon(point: number[], polygon: number[][]): boolean {
    const numVertices = polygon.length;
    const x = point[0];
    const y = point[1];
    let inside = false;

    let p1 = polygon[0];
    let p2 = [0, 0];
    for (let i = 1; i <= numVertices; i++) {
        const idx = i % numVertices;
        p2 = polygon[idx];
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

export interface PolygonIntersectionResult extends IntersectionResult {
    shape: Shape.POLYGON;
    polygon: number[][];
}

export class PolygonIntersectionCalculator implements IntersectionCalculator {
    private _polygon: number[][];

    constructor(polygon: number[][]) {
        this._polygon = polygon;
    }

    calcIntersection(point: number[]): PolygonIntersectionResult | null {
        if (pointIsInPolygon(point, this._polygon)) {
            return {
                shape: Shape.POLYGON,
                point,
                polygon: this._polygon,
            };
        }
        return null;
    }
}
