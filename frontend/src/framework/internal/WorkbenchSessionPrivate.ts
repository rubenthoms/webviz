import { AtomStoreMaster } from "@framework/AtomStoreMaster";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { UserCreatedItems } from "@framework/UserCreatedItems";

import { EnsembleSet } from "../EnsembleSet";
import { EnsembleSetAtom, RealizationFilterSetAtom, UserCreatedItemsAtom } from "../GlobalAtoms";
import { WorkbenchSession, WorkbenchSessionEvent } from "../WorkbenchSession";

export class WorkbenchSessionPrivate extends WorkbenchSession {
    private _atomStoreMaster: AtomStoreMaster;

    constructor(atomStoreMaster: AtomStoreMaster) {
        super();
        this._atomStoreMaster = atomStoreMaster;
        this._atomStoreMaster.setAtomValue(UserCreatedItemsAtom, this._userCreatedItems);
        this._atomStoreMaster.setAtomValue(RealizationFilterSetAtom, this._realizationFilterSet);
    }

    setEnsembleSetLoadingState(isLoading: boolean): void {
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetLoadingStateChanged, { isLoading });
    }

    setEnsembleSet(newEnsembleSet: EnsembleSet): void {
        this._ensembleSet = newEnsembleSet;
        this._realizationFilterSet.synchronizeWithEnsembleSet(this._ensembleSet);
        this._atomStoreMaster.setAtomValue(EnsembleSetAtom, newEnsembleSet);
        this.notifySubscribers(WorkbenchSessionEvent.EnsembleSetChanged);
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }

    notifyAboutEnsembleRealizationFilterChange(): void {
        this.notifySubscribers(WorkbenchSessionEvent.RealizationFilterSetChanged);
    }
}
