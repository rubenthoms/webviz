export enum StatusMessageType {
    Warning = "warning",
    Error = "error",
    ActionRequired = "actionRequired",
}

export enum StatusSource {
    View = "view",
    Settings = "settings",
}

export class ModuleInstanceStatusContributor {
    private _id: string;
    private _messages: string[] = [];

    constructor(id: string) {
        this._id = id;
    }

    addMessage(message: string) {
        this._messages.push(message);
    }
}

export class ModuleInstanceStatusControllerInternal {
    private _contributors: ModuleInstanceStatusContributor[] = [];

    addContributor(contributor: ModuleInstanceStatusContributor) {
        this._contributors.push(contributor);
    }

    aggregateSnapshots() {
}
