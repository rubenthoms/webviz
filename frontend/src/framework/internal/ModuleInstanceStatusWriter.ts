import { isEqual } from "lodash-es";

import type { Status, StatusGroupKey } from "@framework/ModuleInstanceStatus";
import { StatusCategory } from "@framework/ModuleInstanceStatus";
import type { AddStatusOptions, StatusWriter } from "@framework/StatusWriter";

import type { ModuleInstanceStatusManager } from "./ModuleInstanceStatusManager";

type StatusManagerForWriters = Pick<ModuleInstanceStatusManager, "setGroup" | "clearGroup" | "setLoading">;

/**
 * Collects the statuses of one contributor and publishes them as its group in the status manager.
 *
 * With `resetOnRender`, `beginRender()` resets the statuses on every render, and `publish()` publishes them after
 * the render has been committed. Otherwise, every change is published right away.
 */
export class ModuleInstanceStatusWriter implements StatusWriter {
    private readonly _statusManager: StatusManagerForWriters;
    private _groupKey: StatusGroupKey;
    private _resetOnRender: boolean;
    private _publishedGroupKey: StatusGroupKey | null = null;
    private _isMounted = false;
    private _statuses: Status[] = [];
    private _isLoading = false;

    constructor(statusManager: StatusManagerForWriters, groupKey: StatusGroupKey, resetOnRender: boolean) {
        this._statusManager = statusManager;
        this._groupKey = groupKey;
        this._resetOnRender = resetOnRender;
    }

    beginRender(groupKey: StatusGroupKey, resetOnRender: boolean): void {
        this._groupKey = groupKey;
        this._resetOnRender = resetOnRender;
        if (resetOnRender) {
            this._statuses = [];
            this._isLoading = false;
        }
    }

    addError(message: string, options?: AddStatusOptions): void {
        this.add({ category: StatusCategory.DATA_ERROR, message, ...options });
    }

    addWarning(message: string, options?: AddStatusOptions): void {
        this.add({ category: StatusCategory.WARNING, message, ...options });
    }

    flagActionRequired(message: string, options?: AddStatusOptions): void {
        this.add({ category: StatusCategory.ACTION_REQUIRED, message, ...options });
    }

    addRetryableError(message: string, retry?: () => void, options?: AddStatusOptions): void {
        this.add({ category: StatusCategory.RETRYABLE_ERROR, message, retry, ...options });
    }

    set(statuses: readonly Status[]): void {
        this._statuses = [...statuses];
        this.publishIfNotResetOnRender();
    }

    clear(): void {
        this.set([]);
    }

    setLoading(isLoading: boolean): void {
        this._isLoading = isLoading;
        this.publishIfNotResetOnRender();
    }

    /**
     * Called after each committed render. Also (re-)publishes after a remount.
     */
    publish(): void {
        this._isMounted = true;

        if (this._publishedGroupKey && !isEqual(this._publishedGroupKey, this._groupKey)) {
            this._statusManager.clearGroup(this._publishedGroupKey);
        }

        this._statusManager.setGroup(this._groupKey, this._statuses);
        this._statusManager.setLoading(this._groupKey, this._isLoading);
        this._publishedGroupKey = this._groupKey;
    }

    /**
     * Called on unmount. Later calls, e.g. from callbacks that resolve after unmount, are not published.
     */
    unpublish(): void {
        this._isMounted = false;
        if (this._publishedGroupKey) {
            this._statusManager.clearGroup(this._publishedGroupKey);
            this._publishedGroupKey = null;
        }
    }

    private add(status: Status): void {
        this._statuses.push(status);
        this.publishIfNotResetOnRender();
    }

    private publishIfNotResetOnRender(): void {
        if (!this._resetOnRender && this._isMounted) {
            this.publish();
        }
    }
}
