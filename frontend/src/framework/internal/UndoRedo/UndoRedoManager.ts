import { isEqual } from "lodash";

import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

export type UndoRedoDirection = "undo" | "redo";

export interface UndoCommand {
    label?: string; // Optional label for the command, can be used in UI to indicate the action being undone/redone

    undo(): void | Promise<void>; // Function to perform the undo action, can be asynchronous
    redo(): void | Promise<void>; // Function to perform the redo action, can be asynchronous

    merge?(next: UndoCommand): UndoCommand | null; // Optional function to merge this command with the next one, used for coalescing multiple related actions into a single undo step
}

type Group = {
    label?: string; // Optional label for the group, can be used in UI to indicate the action being undone/redone
    commands: UndoCommand[]; // List of commands in this group
};

export enum UndoRedoManagerTopic {
    STATE = "state",
}

export type UndoRedoManagerState = {
    canUndo: boolean;
    canRedo: boolean;
    undoLabel: string | null;
    redoLabel: string | null;
    undoCount: number;
    redoCount: number;
    isPaused: boolean;
    isReplaying: boolean;
};

export type UndoRedoManagerTopicPayloads = {
    [UndoRedoManagerTopic.STATE]: UndoRedoManagerState;
};

export class UndoRedoManager implements PublishSubscribe<UndoRedoManagerTopicPayloads> {
    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<UndoRedoManagerTopicPayloads>();
    private _maxEntries: number; // Maximum number of entries to keep in the undo/redo stacks

    private _stack: UndoCommand[] = [];
    private _cursor = 0; // points to "next redo index" (standard)

    private _paused: boolean = false; // Flag to indicate if the manager is paused (used to temporarily disable recording of commands, e.g. during batch operations)
    private _isReplaying: boolean = false; // Flag to indicate if the manager is currently replaying commands (used to prevent recording of commands during undo/redo operations)

    private _groupStack: Group[] = []; // Stack of command groups for handling nested groups

    private _snapshot: UndoRedoManagerState = {
        canUndo: false,
        canRedo: false,
        undoLabel: null,
        redoLabel: null,
        undoCount: 0,
        redoCount: 0,
        isPaused: false,
        isReplaying: false,
    };

    constructor(maxEntries: number = 100) {
        this._maxEntries = maxEntries;
    }

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<UndoRedoManagerTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends keyof UndoRedoManagerTopicPayloads>(topic: T): () => UndoRedoManagerTopicPayloads[T] {
        return () => {
            if (topic === UndoRedoManagerTopic.STATE) return this._snapshot as any;
            throw new Error(`Unknown topic: ${String(topic)}`);
        };
    }

    isReplaying(): boolean {
        return this._isReplaying;
    }

    pause(): void {
        this._paused = true;
    }

    resume(): void {
        this._paused = false;
    }

    clear(): void {
        this._stack = [];
        this._cursor = 0;
        this._groupStack = [];
        this.updateSnapshot();
    }

    canUndo(): boolean {
        return this._cursor > 0;
    }

    canRedo(): boolean {
        return this._cursor < this._stack.length;
    }

    beginGroup(label?: string): void {
        this._groupStack.push({ label, commands: [] });
    }

    endGroup(): void {
        const group = this._groupStack.pop();
        if (!group) return;

        if (group.commands.length === 0) return;

        const grouped = new GroupCommand(group.commands, group.label);

        const parent = this._groupStack[this._groupStack.length - 1];
        if (parent) {
            parent.commands.push(grouped);
        } else {
            this.push(grouped);
        }
    }

    push(command: UndoCommand): void {
        if (this._paused || this._isReplaying) return;

        const currentGroup = this._groupStack[this._groupStack.length - 1];
        if (currentGroup) {
            currentGroup.commands.push(command);
            return;
        }

        // If we have redo items, truncate
        if (this._cursor < this._stack.length) {
            this._stack = this._stack.slice(0, this._cursor);
        }

        // try to merge with the last command if possible
        // Try merge with previous
        const prev = this._stack[this._stack.length - 1];
        if (prev && prev.merge) {
            const merged = prev.merge(command);
            if (merged) {
                this._stack[this._stack.length - 1] = merged;
                this.updateSnapshot();
                return;
            }
        }

        this._stack.push(command);
        this._cursor = this._stack.length;
        this.updateSnapshot();
    }

    undo(): void {
        if (!this.canUndo()) return;

        this._isReplaying = true;
        try {
            const cmd = this._stack[this._cursor - 1]!;
            cmd.undo();
            this._cursor--;
        } finally {
            this._isReplaying = false;
            this.updateSnapshot();
        }
    }

    redo(): void {
        if (!this.canRedo()) return;

        this._isReplaying = true;
        try {
            const cmd = this._stack[this._cursor]!;
            cmd.redo();
            this._cursor++;
        } finally {
            this._isReplaying = false;
            this.updateSnapshot();
        }
    }

    private updateSnapshot(): void {
        const undoCmd = this._cursor > 0 ? this._stack[this._cursor - 1] : null;
        const redoCmd = this._cursor < this._stack.length ? this._stack[this._cursor] : null;

        const next: UndoRedoManagerState = {
            canUndo: this._cursor > 0,
            canRedo: this._cursor < this._stack.length,
            undoLabel: undoCmd?.label ?? null,
            redoLabel: redoCmd?.label ?? null,
            undoCount: this._cursor,
            redoCount: this._stack.length - this._cursor,
            isPaused: this._paused,
            isReplaying: this._isReplaying,
        };

        // Keep snapshot reference stable if unchanged (important for React.useSyncExternalStore)
        if (!isEqual(this._snapshot, next)) {
            this._snapshot = next;
            this._publishSubscribeDelegate.notifySubscribers(UndoRedoManagerTopic.STATE);
        }
    }
}

class GroupCommand implements UndoCommand {
    private _commands: UndoCommand[];
    private _label: string | undefined;

    constructor(commands: UndoCommand[], label?: string) {
        this._commands = commands;
        this._label = label;
    }

    async undo(): Promise<void> {
        for (let i = this._commands.length - 1; i >= 0; i--) {
            await this._commands[i].undo();
        }
    }

    async redo(): Promise<void> {
        for (const command of this._commands) {
            await command.redo();
        }
    }
}
