export interface BusinessLogicState {
    userSelection: {
        ensembleIdent: string;
        vector: string;
    };
    utilityData: {
        vectors: string[];
    };
}

export class BusinessLogic {
    private _state: BusinessLogicState = {
        userSelection: {
            ensembleIdent: "",
            vector: "",
        },
        utilityData: {
            vectors: [],
        },
    };
    private _subscribers: Set<() => void> = new Set();

    subscribe(onStoreChangeCallback: () => void): () => void {
        this._subscribers.add(onStoreChangeCallback);

        return () => {
            this._subscribers.delete(onStoreChangeCallback);
        };
    }

    getSnapshot(): BusinessLogicState {
        return this._state;
    }
}
