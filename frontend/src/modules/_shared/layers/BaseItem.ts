import { v4 } from "uuid";

export enum MessageType {
    ADDED = "added",
    CHANGED = "changed",
    REMOVED = "removed",
}

export enum MessageDirection {
    UP = "up",
    DOWN = "down",
}

export class Message {
    type: MessageType;
    payload: any;
    origin: BaseItem;
    direction: MessageDirection;

    private _isPropagationStopped: boolean = false;

    constructor(type: MessageType, payload: any, origin: BaseItem, direction: MessageDirection = MessageDirection.UP) {
        this.type = type;
        this.payload = payload;
        this.origin = origin;
        this.direction = direction;
    }

    stopPropagation(): void {
        this._isPropagationStopped = true;
    }

    isPropagationStopped(): boolean {
        return this._isPropagationStopped;
    }

    clone(): Message {
        return new Message(this.type, this.payload, this.origin, this.direction);
    }
}

export class BaseItem {
    private _parent: BaseItem | null = null;
    private _children: BaseItem[] = [];
    private _id: string;
    private _name: string;

    constructor(name: string, parent: BaseItem | null = null) {
        this._id = v4();
        this._parent = parent;
        this._name = name;
    }

    getId(): string {
        return this._id;
    }

    getName(): string {
        return this._name;
    }

    setName(name: string): void {
        this._name = name;
    }

    protected getParent(): BaseItem | null {
        return this._parent;
    }

    protected emitMessage(message: Message): void {
        if (message.direction === MessageDirection.UP) {
            this.getParent()?.handleMessage(message);
            if (!message.isPropagationStopped()) {
                this.getParent()?.emitMessage(message);
            }
        } else {
            this.getChildren().forEach((child) => {
                child.handleMessage(message);
                if (!message.isPropagationStopped()) {
                    child.emitMessage(message);
                }
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected handleMessage(message: Message): void {
        // To be implemented in subclasses
    }

    protected getAncestorsAndSiblings(): BaseItem[] {
        const ancestors: BaseItem[] = [];
        let parent = this._parent;
        while (parent) {
            ancestors.push(...parent.getChildren());
            ancestors.push(parent);
            parent = parent.getParent();
        }
        return ancestors;
    }

    protected getAllDescendants(): BaseItem[] {
        const descendants: BaseItem[] = [];
        this.getChildren().forEach((child) => {
            descendants.push(child);
            descendants.push(...child.getAllDescendants());
        });
        return descendants;
    }

    protected getDescendant(id: string): BaseItem | undefined {
        const stack: BaseItem[] = this.getChildren();
        while (stack.length > 0) {
            const item = stack.pop();
            if (item?.getId() === id) {
                return item;
            }
            stack.push(...(item?.getChildren() ?? []));
        }
        return undefined;
    }

    protected setParent(parent: BaseItem | null): void {
        this._parent = parent;
    }

    protected getChildren(): BaseItem[] {
        return this._children;
    }

    protected getChild(id: string): BaseItem | undefined {
        return this._children.find((child) => child.getId() === id);
    }

    protected prependChild(child: BaseItem): void {
        this._children = [child, ...this._children];
        child.setParent(this);
    }

    protected appendChild(child: BaseItem): void {
        this._children.push(child);
        child.setParent(this);
    }

    protected insertChild(child: BaseItem, position: number): void {
        this._children.splice(position, 0, child);
        child.setParent(this);
    }

    protected removeChild(id: string): void {
        this._children = this._children.filter((child) => child.getId() !== id);
    }

    protected setChildren(children: BaseItem[]): void {
        this._children = children;
    }
}
