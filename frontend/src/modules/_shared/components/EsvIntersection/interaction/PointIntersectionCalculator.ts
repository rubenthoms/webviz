import { BoundingSphere2D } from "./BoundingSphere2D";
import { IntersectedItem, IntersectionCalculator, Shape } from "./types";

export interface PointIntersectedItem extends IntersectedItem {
    shape: Shape.POINT;
}

export class PointIntersectionCalculator implements IntersectionCalculator {
    private _boundingSphere: BoundingSphere2D;

    constructor(point: number[], margin: number = 10) {
        this._boundingSphere = new BoundingSphere2D(point, margin);
    }

    calcIntersection(point: number[]): PointIntersectedItem | null {
        if (!this._boundingSphere.contains(point)) {
            return null;
        }

        return {
            shape: Shape.POINT,
            point: this._boundingSphere.getCenter(),
        };
    }
}
