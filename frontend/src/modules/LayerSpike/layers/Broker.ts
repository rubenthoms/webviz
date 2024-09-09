import { Message, MessageDirection } from "./Message";

export class Broker {
    private _parentBroker: Broker | null = null;
    private _childrenBrokers: Broker[] = [];
    private _messageCallback: ((message: Message) => void) | null = null;

    constructor(parent: Broker | null) {
        this._parentBroker = parent;
    }

    setParent(parent: Broker | null) {
        this._parentBroker = parent;
    }

    setChildren(children: Broker[]) {
        this._childrenBrokers = children;
    }

    addChild(child: Broker) {
        this._childrenBrokers.push(child);
    }

    removeChild(child: Broker) {
        this._childrenBrokers = this._childrenBrokers.filter((broker) => broker !== child);
    }

    handleAndMaybeForwardMessage(message: Message) {
        this.callCallback(message);

        if (message.isPropagationStopped()) {
            return;
        }

        this.emit(message);
    }

    emit(message: Message) {
        if (message.getDirection() === MessageDirection.UP && this._parentBroker) {
            this._parentBroker.handleAndMaybeForwardMessage(message);
            return;
        }

        if (message.getDirection() === MessageDirection.DOWN) {
            for (const child of this._childrenBrokers) {
                child.handleAndMaybeForwardMessage(message);
            }
        }
    }

    onMessage(callback: (message: Message) => void) {
        this._messageCallback = callback;
    }

    callCallback(message: Message): void {
        const callback = this._messageCallback;
        if (callback) {
            callback(message);
        }
    }
}
