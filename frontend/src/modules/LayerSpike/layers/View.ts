import { v4 } from "uuid";

import { GroupDelegate } from "./delegates/GroupDelegate";
import { ItemDelegate } from "./delegates/ItemDelegate";
import { Group } from "./interfaces";

export class View implements Group {
    private _itemDelegate: ItemDelegate;
    private _groupDelegate: GroupDelegate;
    private _name: string;
    private _id: string;

    constructor(name: string) {
        this._id = v4();
        this._name = name;
        this._groupDelegate = new GroupDelegate(this);
        this._itemDelegate = new ItemDelegate(name);
    }

    getId() {
        return this._id;
    }

    getName() {
        return this._name;
    }

    getItemDelegate(): ItemDelegate {
        return this._itemDelegate;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupDelegate;
    }

    setName(name: string) {
        this._name = name;
    }
}
