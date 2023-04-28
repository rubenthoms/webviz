import { ImportState, ModuleFC } from "./ModuleBase";
import { ModuleBase } from "./ModuleBase";
import { ModuleContext } from "./ModuleContext";
import { StateBaseType, StateOptions, StateStore, useSetStoreValue, useStoreState, useStoreValue } from "./StateStore";

export class ModuleInstance<StateType extends StateBaseType> {
    private id: string;
    private name: string;
    private initialised: boolean;
    private stateStore: StateStore<StateType> | null;
    private module: ModuleBase<StateType>;
    private context: ModuleContext<StateType> | null;
    private importStateSubscribers: Set<() => void>;
    private subModules: ModuleInstance<any>[];
    private parentModuleInstance: ModuleInstance<any> | null;

    constructor(module: ModuleBase<StateType>, instanceNumber: number, id?: string) {
        this.id = id ?? `${module.getName()}-${instanceNumber}`;
        this.name = module.getName();
        this.stateStore = null;
        this.module = module;
        this.importStateSubscribers = new Set();
        this.context = null;
        this.initialised = false;
        this.subModules = [];
        this.parentModuleInstance = null;
    }

    public addSubModuleInstance(subModuleInstance: ModuleInstance<any>): void {
        this.subModules.push(subModuleInstance);
    }

    public setParentModuleInstance(parentModuleInstance: ModuleInstance<any>): void {
        this.parentModuleInstance = parentModuleInstance;
    }

    public getParentModuleInstance(): ModuleInstance<any> | null {
        return this.parentModuleInstance;
    }

    public setInitialState(initialState: StateType, options?: StateOptions<StateType>): void {
        this.stateStore = new StateStore<StateType>(initialState, options);
        this.context = new ModuleContext<StateType>(this, this.stateStore);
        this.initialised = true;
    }

    public isInitialised(): boolean {
        return this.initialised;
    }

    public getViewFC(): ModuleFC<StateType> {
        return this.module.getViewFC();
    }

    public getSettingsFC(): ModuleFC<StateType> | null {
        return this.module.getSettingsFC();
    }

    public getImportState(): ImportState {
        return this.module.getImportState();
    }

    public getContext(): ModuleContext<StateType> {
        if (!this.context) {
            throw `Module context is not available yet. Did you forget to init the module '${this.name}.'?`;
        }
        return this.context;
    }

    public getId(): string {
        return this.id;
    }

    public getName(): string {
        return this.name;
    }

    public getModule(): ModuleBase<StateType> {
        return this.module;
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
