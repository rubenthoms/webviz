import { UnsubscribeFunctionsManagerDelegate } from "@lib/utils/UnsubscribeFunctionsManagerDelegate";

import type { UndoCommand, UndoRedoManager } from "./UndoRedoManager";

export type UndoRedoGeneratorContext = {
    undoRedoManager: UndoRedoManager;
    isReplaying: () => boolean;
};

export type UndoRedoGeneratorTools = {
    unsubs: UnsubscribeFunctionsManagerDelegate;
    push: (command: UndoCommand) => void;
    beginGroup: (label?: string) => void;
    endGroup: () => void;
    isPaused: () => boolean;
};

export interface UndoRedoGeneratorImpl {
    onAttach(context: UndoRedoGeneratorContext, tools: UndoRedoGeneratorTools): void;
    onDetach?(): void;
}

export class UndoRedoGenerator {
    private _context: UndoRedoGeneratorContext | null = null;
    private _attached = false;
    private _paused = false;

    private _unsubs = new UnsubscribeFunctionsManagerDelegate();

    private _impl: UndoRedoGeneratorImpl;

    constructor(impl: UndoRedoGeneratorImpl) {
        this._impl = impl;
    }

    attach(undoRedoManager: UndoRedoManager): void {
        if (this._attached) return;
        this._attached = true;

        this._context = {
            undoRedoManager,
            isReplaying: () => undoRedoManager.isReplaying(),
        };

        const tools: UndoRedoGeneratorTools = {
            unsubs: this._unsubs,
            push: (command: UndoCommand) => {
                if (!this._context || this._paused || this._context.isReplaying()) return;
                this._context.undoRedoManager.push(command);
            },
            beginGroup: (label?: string) => {
                if (!this._context || this._paused || this._context.isReplaying()) return;
                this._context.undoRedoManager.beginGroup(label);
            },
            endGroup: () => {
                this._context?.undoRedoManager.endGroup();
            },
            isPaused: () => this._paused,
        };

        this._impl.onAttach(this._context, tools);
    }

    detach(): void {
        if (!this._attached) return;
        this._attached = false;

        this._unsubs.unsubscribeAll();
        this._impl.onDetach?.();
        this._context = null;
    }

    pause(): void {
        this._paused = true;
    }

    resume(): void {
        this._paused = false;
    }
}
