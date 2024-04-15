import { UserCreatedItemSet } from "@framework/UserCreatedItems";

import { v4 } from "uuid";

export type IntersectionPolyline = {
    id: string;
    name: string;
    points: number[][];
};

export type IntersectionPolylineWithoutId = Omit<IntersectionPolyline, "id">;

export class IntersectionPolylines implements UserCreatedItemSet {
    private _polylines: IntersectionPolyline[] = [];

    serialize(): string {
        return JSON.stringify(this._polylines);
    }

    populateFromData(data: string): void {
        this._polylines = JSON.parse(data);
    }

    add(polyline: IntersectionPolylineWithoutId): void {
        const id = v4();
        this._polylines.push({
            id,
            ...polyline,
        });
    }

    remove(id: string): void {
        this._polylines = this._polylines.filter((polyline) => polyline.id !== id);
    }

    getPolylines(): IntersectionPolyline[] {
        return this._polylines;
    }

    getPolyline(id: string): IntersectionPolyline | undefined {
        return this._polylines.find((polyline) => polyline.id === id);
    }

    updatePolyline(id: string, polyline: IntersectionPolylineWithoutId): void {
        const index = this._polylines.findIndex((polyline) => polyline.id === id);
        this._polylines[index] = {
            id,
            ...polyline,
        };
    }
}
