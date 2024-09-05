import { v4 } from "uuid";

import { Group, GroupHandler } from "./GroupHandler";

export class View implements Group {
    private _groupHandler: GroupHandler = new GroupHandler();
    private _name: string;
    private _id: string;

    constructor(name: string) {
        this._id = v4();
        this._name = name;
    }

    getId() {
        return this._id;
    }

    getName() {
        return this._name;
    }

    getGroupHandler(): GroupHandler {
        return this._groupHandler;
    }

    setName(name: string) {
        this._name = name;
    }
}
