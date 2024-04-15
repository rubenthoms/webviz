import { AtomStoreMaster } from "./AtomStoreMaster";
import { IntersectionPolylines } from "./userCreatedItems/IntersectionPolylines";

export interface UserCreatedItemSet {
    serialize(): string;
    populateFromData(data: string): void;
}

export class UserCreatedItems {
    private _intersectionPolylines: IntersectionPolylines;

    constructor() {
        this._intersectionPolylines = new IntersectionPolylines();
    }

    getIntersectionPolylines(): IntersectionPolylines {
        return this._intersectionPolylines;
    }

    isEqual(other: UserCreatedItems): boolean {
        return this._intersectionPolylines.serialize() === other._intersectionPolylines.serialize();
    }
}
