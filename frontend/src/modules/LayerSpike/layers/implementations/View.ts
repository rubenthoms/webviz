import { GroupDelegate } from "../GroupDelegate";
import { LayerManager } from "../LayerManager";
import { Group } from "../interfaces";

export class View implements Group {
    private _name: string;
    private _id: string;
    private _groupHandler: GroupDelegate;

    constructor(layerManager: LayerManager, name: string) {
        this._id = "view";
        this._name = name;
        this._groupHandler = new GroupDelegate(layerManager);
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

    getGroupDelegate(): GroupDelegate {
        return this._groupHandler;
    }

    getBroker() {
        return this._groupHandler.getBroker();
    }
}
