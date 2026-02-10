import { ModuleInstanceTopic, type ModuleInstance } from "@framework/ModuleInstance";

import type { UndoRedoGeneratorContext, UndoRedoGeneratorImpl, UndoRedoGeneratorTools } from "./UndoRedoGenerator";

export class ModuleInstanceUndoRedoGeneratorImpl implements UndoRedoGeneratorImpl {
    private _instance: ModuleInstance<any, any>;

    constructor(instance: ModuleInstance<any, any>) {
        this._instance = instance;
    }

    onAttach(context: UndoRedoGeneratorContext, tools: UndoRedoGeneratorTools): void {
        tools.unsubs.registerUnsubscribeFunction(
            `module-instance-${this._instance.getId()}`,
            this._instance.makeSubscriberFunction(ModuleInstanceTopic.SERIALIZED_STATE)(() => {
                if (tools.isPaused()) return;

                console.debug(
                    `ModuleInstanceUndoRedoGeneratorImpl: Detected state change for instance ${this._instance.getId()}, generating undo/redo command.`,
                );
            }),
        );
    }
}
