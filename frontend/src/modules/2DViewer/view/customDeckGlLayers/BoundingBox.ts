import { Vec2 } from "@lib/utils/vec2";

export class BoundingBox2D {
    private _topLeft: Vec2;
    private _bottomRight: Vec2;

    constructor(topLeft: Vec2, bottomRight: Vec2) {
        this._topLeft = topLeft;
        this._bottomRight = bottomRight;
    }

    getTopLeft(): Vec2 {
        return this._topLeft;
    }

    getBottomRight(): Vec2 {
        return this._bottomRight;
    }

    contains(point: Vec2): boolean {
        return (
            point.x >= this._topLeft.x &&
            point.x <= this._bottomRight.x &&
            point.y >= this._topLeft.y &&
            point.y <= this._bottomRight.y
        );
    }

    intersects(other: BoundingBox2D): boolean {
        return (
            this._topLeft.x <= other._bottomRight.x &&
            this._bottomRight.x >= other._topLeft.x &&
            this._topLeft.y <= other._bottomRight.y &&
            this._bottomRight.y >= other._topLeft.y
        );
    }

    getCenter(): Vec2 {
        return {
            x: (this._topLeft.x + this._bottomRight.x) / 2,
            y: (this._topLeft.y + this._bottomRight.y) / 2,
        };
    }

    getWidth(): number {
        return this._bottomRight.x - this._topLeft.x;
    }

    getHeight(): number {
        return this._bottomRight.y - this._topLeft.y;
    }

    getIntersectionArea(other: BoundingBox2D): number {
        if (!this.intersects(other)) {
            return 0;
        }

        const xOverlap =
            Math.min(this._bottomRight.x, other._bottomRight.x) - Math.max(this._topLeft.x, other._topLeft.x);
        const yOverlap =
            Math.min(this._bottomRight.y, other._bottomRight.y) - Math.max(this._topLeft.y, other._topLeft.y);

        return xOverlap * yOverlap;
    }

    getIntersectionVector(other: BoundingBox2D): Vec2 {
        if (!this.intersects(other)) {
            return { x: 0, y: 0 };
        }

        const xOverlap =
            Math.min(this._bottomRight.x, other._bottomRight.x) - Math.max(this._topLeft.x, other._topLeft.x);
        const yOverlap =
            Math.min(this._bottomRight.y, other._bottomRight.y) - Math.max(this._topLeft.y, other._topLeft.y);

        return { x: xOverlap, y: yOverlap };
    }
}

export class QuadTree {
    static makeQuadtree(): QuadTree {}
}
