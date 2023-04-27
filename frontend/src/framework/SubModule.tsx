import { ModuleType } from "./ModuleBase";
import { ModuleBase, ModuleFC } from "./ModuleBase";

type NoState = Record<string, never>;

export class SubModule<StateType extends NoState> extends ModuleBase<StateType> {
    constructor(name: string) {
        super(name);
    }

    public getType(): ModuleType {
        return ModuleType.SubModule;
    }
}
