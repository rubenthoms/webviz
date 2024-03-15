import { BoundingSphere2D } from "./BoundingSphere2D";
import { IntersectionCalculator, IntersectionResult, Shape } from "./types";

export interface PointIntersectionResult extends IntersectionResult {
    shape: Shape.POINT;
    distance: number;
}

export class PointIntersectionCalculator implements IntersectionCalculator {
    private _boundingSphere: BoundingSphere2D;

    constructor(point: number[], margin: number = 10) {
        this._boundingSphere = new BoundingSphere2D(point, margin);
    }

    calcIntersection(point: number[]): PointIntersectionResult | null {
        if (!this._boundingSphere.contains(point)) {
            return null;
        }

        const distance = Math.sqrt(
            Math.pow(point[0] - this._boundingSphere.getCenter()[0], 2) +
                Math.pow(point[1] - this._boundingSphere.getCenter()[1], 2)
        );
        return {
            shape: Shape.POINT,
            point,
            distance,
        };
    }
}
