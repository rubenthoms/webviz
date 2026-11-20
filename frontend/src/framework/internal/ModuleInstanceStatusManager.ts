import { isEqual } from "lodash-es";

import type { Status, StatusAdditionalInfo, StatusGroupKey } from "@framework/ModuleInstanceStatus";
import { StatusCategory } from "@framework/ModuleInstanceStatus";
import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

/**
 * A reported status as published to the UI. Plain data, so snapshots can be compared by content.
 * Actions go through the manager by ID, which always uses the latest reported callbacks.
 */
export type StatusEntry = {
    /** Unique per entry: group key and identity */
    id: string;
    /** Used for acknowledgement: category, and the status' key or message. Equal statuses from several groups share it */
    identity: string;
    groupKey: StatusGroupKey;
    category: StatusCategory;
    message: string;
    additionalInfo: StatusAdditionalInfo | null;
    canRetry: boolean;
    acknowledged: boolean;
};

export enum ModuleInstanceStatusManagerTopic {
    STATUSES = "STATUSES",
    LOADING = "LOADING",
}

export type ModuleInstanceStatusManagerTopicPayloads = {
    [ModuleInstanceStatusManagerTopic.STATUSES]: readonly StatusEntry[];
    [ModuleInstanceStatusManagerTopic.LOADING]: boolean;
};

const ACKNOWLEDGEABLE_CATEGORIES: ReadonlySet<StatusCategory> = new Set([
    StatusCategory.WARNING,
    StatusCategory.RETRYABLE_ERROR,
]);

type StoredStatus = Omit<StatusEntry, "acknowledged"> & {
    retry: (() => void) | null;
};

/**
 * Holds the current status of one module instance: the statuses reported by its contributors, grouped by
 * group key, and whether any contributor is loading. Status is the state of what the view shows right now - it is
 * not logged.
 *
 * Acknowledgements are kept for the lifetime of the module instance, so an acknowledged status stays
 * acknowledged when it is reported again - also by another contributor, or after a remount.
 */
export class ModuleInstanceStatusManager implements PublishSubscribe<ModuleInstanceStatusManagerTopicPayloads> {
    private readonly _publishSubscribeDelegate =
        new PublishSubscribeDelegate<ModuleInstanceStatusManagerTopicPayloads>();
    private readonly _groups = new Map<string, StoredStatus[]>();
    private readonly _loadingGroups = new Set<string>();
    private readonly _acknowledgedIdentities = new Set<string>();
    private _statusEntries: readonly StatusEntry[] = [];
    private _isLoading = false;

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ModuleInstanceStatusManagerTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends ModuleInstanceStatusManagerTopic>(
        topic: T,
    ): () => ModuleInstanceStatusManagerTopicPayloads[T] {
        return (): ModuleInstanceStatusManagerTopicPayloads[T] => {
            if (topic === ModuleInstanceStatusManagerTopic.STATUSES) {
                return this._statusEntries as ModuleInstanceStatusManagerTopicPayloads[T];
            }
            if (topic === ModuleInstanceStatusManagerTopic.LOADING) {
                return this._isLoading as ModuleInstanceStatusManagerTopicPayloads[T];
            }
            throw new Error(`Unknown topic: ${topic}`);
        };
    }

    getStatusEntries(): readonly StatusEntry[] {
        return this._statusEntries;
    }

    isLoading(): boolean {
        return this._isLoading;
    }

    /**
     * Replaces all statuses of a group. An empty list removes the group's statuses, but not its loading state.
     */
    setGroup(groupKey: StatusGroupKey, statuses: readonly Status[]): void {
        const serializedGroupKey = JSON.stringify(groupKey);

        if (statuses.length === 0) {
            this._groups.delete(serializedGroupKey);
        } else {
            this._groups.set(serializedGroupKey, makeStoredStatuses(groupKey, statuses));
        }

        this.publishStatusEntriesIfChanged();
    }

    /**
     * Removes all statuses and the loading state of a group, e.g. when its contributor unmounts.
     */
    clearGroup(groupKey: StatusGroupKey): void {
        this.setGroup(groupKey, []);
        this.setLoading(groupKey, false);
    }

    /**
     * Sets the loading state of a group. The module instance is loading while any group is loading.
     */
    setLoading(groupKey: StatusGroupKey, isLoading: boolean): void {
        const serializedGroupKey = JSON.stringify(groupKey);
        if (isLoading) {
            this._loadingGroups.add(serializedGroupKey);
        } else {
            this._loadingGroups.delete(serializedGroupKey);
        }

        const isAnyGroupLoading = this._loadingGroups.size > 0;
        if (this._isLoading === isAnyGroupLoading) {
            return;
        }
        this._isLoading = isAnyGroupLoading;
        this._publishSubscribeDelegate.notifySubscribers(ModuleInstanceStatusManagerTopic.LOADING);
    }

    /**
     * Acknowledges (or dismisses) a status, and all equal statuses from other groups.
     * Only warnings and retryable errors can be acknowledged.
     */
    acknowledge(id: string): void {
        const status = this.findStoredStatus(id);
        if (!status || !ACKNOWLEDGEABLE_CATEGORIES.has(status.category)) {
            return;
        }

        this._acknowledgedIdentities.add(status.identity);
        this.publishStatusEntriesIfChanged();
    }

    retry(id: string): void {
        this.findStoredStatus(id)?.retry?.();
    }

    private findStoredStatus(id: string): StoredStatus | undefined {
        for (const statuses of this._groups.values()) {
            const status = statuses.find((candidate) => candidate.id === id);
            if (status) {
                return status;
            }
        }
        return undefined;
    }

    private publishStatusEntriesIfChanged(): void {
        const statusEntries: StatusEntry[] = [];
        for (const statuses of this._groups.values()) {
            for (const status of statuses) {
                statusEntries.push({
                    id: status.id,
                    identity: status.identity,
                    groupKey: status.groupKey,
                    category: status.category,
                    message: status.message,
                    additionalInfo: status.additionalInfo,
                    canRetry: status.canRetry,
                    acknowledged: this._acknowledgedIdentities.has(status.identity),
                });
            }
        }

        if (isEqual(statusEntries, this._statusEntries)) {
            return;
        }

        this._statusEntries = statusEntries;
        this._publishSubscribeDelegate.notifySubscribers(ModuleInstanceStatusManagerTopic.STATUSES);
    }
}

function makeStoredStatuses(groupKey: StatusGroupKey, statuses: readonly Status[]): StoredStatus[] {
    const storedStatuses = new Map<string, StoredStatus>();

    for (const status of statuses) {
        const identity = JSON.stringify([status.category, status.key ?? status.message]);
        const id = JSON.stringify([groupKey, identity]);
        if (storedStatuses.has(id)) {
            continue;
        }

        const retry = status.category === StatusCategory.RETRYABLE_ERROR ? (status.retry ?? null) : null;
        storedStatuses.set(id, {
            id,
            identity,
            groupKey: [...groupKey],
            category: status.category,
            message: status.message,
            additionalInfo: status.additionalInfo ?? null,
            canRetry: retry !== null,
            retry,
        });
    }

    return Array.from(storedStatuses.values());
}
