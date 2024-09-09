export enum MessageDirection {
    UP = "UP",
    DOWN = "DOWN",
}

export enum MessageType {
    SETTINGS_CHANGED = "SETTINGS_CHANGED",
    AVAILABLE_SETTINGS_CHANGED = "AVAILABLE_SETTINGS_CHANGED",
    DESCENDANTS_CHANGED = "DESCENDANTS_CHANGED",
}

export class Message {
    private _direction: MessageDirection;
    private _type: MessageType;
    private _propagationStopped: boolean = false;

    constructor(type: MessageType, direction: MessageDirection) {
        this._type = type;
        this._direction = direction;
    }

    getType() {
        return this._type;
    }

    getDirection() {
        return this._direction;
    }

    stopPropagation() {
        this._propagationStopped = true;
    }

    isPropagationStopped() {
        return this._propagationStopped;
    }
}
