import { ImportState } from "./Module";
import { Module } from "./Module";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore } from "./StateStore";

export class ModuleInstance<StateType extends StateBaseType> {
    private id: string;
    protected name: string;
    private initialised: boolean;
    private _module: Module<StateType>;
    protected stateStore: StateStore<StateType> | null;
    private importStateSubscribers: Set<() => void>;

    constructor(module: Module<StateType>, instanceNumber: number, id?: string) {
        this.id = id ?? `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this._module = module;
        this.stateStore = null;
        this.importStateSubscribers = new Set();
        this.initialised = false;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.stateStore = new StateStore<StateType>(initialState, options);
        this.initialised = true;
    }

    public isInitialised(): boolean {
        return this.initialised;
    }

    public getImportState(): ImportState {
        return this._module.getImportState();
    }

    public getContext(): ModuleContext<StateType> {
        throw "Not implemented";
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getModule(): Module<StateType> {
        return this._module;
    }

    public subscribeToImportStateChange(cb: () => void) {
        this.importStateSubscribers.add(cb);
        return () => {
            this.importStateSubscribers.delete(cb);
        };
    }

    public notifySubscribersAboutImportStateChange(): void {
        this.importStateSubscribers.forEach((subscriber) => {
            subscriber();
        });
    }
}
