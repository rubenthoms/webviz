import { GroupHandler } from "../GroupHandler";
import { Group } from "../interfaces";

export class View implements Group {
    private _name: string;
    private _id: string;
    private _groupHandler: GroupHandler = new GroupHandler();

    constructor(name: string) {
        this._id = "view";
        this._name = name;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string) {
        this._name = name;
    }

    getGroupHandler(): GroupHandler {
        return this._groupHandler;
    }
}
