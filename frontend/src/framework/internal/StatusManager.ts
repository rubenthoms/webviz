import { QueryStatusManager } from "./QueryStatusManager";

export type StatusContribution = {
    type: "";
};

export type StatusContributorKey = string[];

export type StatusSubscriber = (contribution: StatusContribution) => void;

export interface StatusContributor {
    subscribe(subscriber: StatusSubscriber): void;
    unsubscribe(subscriber: StatusSubscriber): void;
    getName(): string;
}

export class StatusManager {
    private readonly _contributors: Map<StatusContributorKey, StatusContributor> = new Map();
    private readonly _contributions: Map<StatusContributorKey, StatusContribution> = new Map();

    private readonly _queryStatusManager: QueryStatusManager;

    constructor(queryStatusManager: QueryStatusManager) {
        this._queryStatusManager = queryStatusManager;
    }

    registerContributor(key: StatusContributorKey, contributor: StatusContributor): void {
        this._contributors.set(key, contributor);
        contributor.subscribe((contribution) => {
            this._contributions.set(key, contribution);
            // Handle the contribution here if needed
        });
    }

    unregisterContributor(key: StatusContributorKey): void {
        const contributor = this._contributors.get(key);
        if (contributor) {
            contributor.unsubscribe((contribution) => {
                this._contributions.delete(key);
            });
        }
        this._contributors.delete(key);
    }

    getContributor(key: StatusContributorKey): StatusContributor | undefined {
        return this._contributors.get(key);
    }
}
