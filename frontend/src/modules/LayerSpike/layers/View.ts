import { v4 } from "uuid";

import { Broker } from "./Broker";
import { GroupDelegate } from "./GroupDelegate";
import { Group } from "./interfaces";

export class View implements Group {
    private _groupHandler: GroupDelegate;
    private _name: string;
    private _id: string;

    constructor(name: string) {
        this._id = v4();
        this._name = name;
        this._groupHandler = new GroupDelegate(null);
    }

    getBroker(): Broker {
        return this._groupHandler.getBroker();
    }

    getId() {
        return this._id;
    }

    getName() {
        return this._name;
    }

    getGroupDelegate(): GroupDelegate {
        return this._groupHandler;
    }

    setName(name: string) {
        this._name = name;
    }
}
