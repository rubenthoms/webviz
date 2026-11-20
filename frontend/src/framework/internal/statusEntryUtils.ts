import { StatusCategory } from "@framework/ModuleInstanceStatus";

import type { StatusEntry } from "./ModuleInstanceStatusManager";

const CATEGORY_DISPLAY_ORDER: readonly StatusCategory[] = [
    StatusCategory.ACTION_REQUIRED,
    StatusCategory.DATA_ERROR,
    StatusCategory.RETRYABLE_ERROR,
    StatusCategory.WARNING,
];

export type StatusCounts = {
    numActionRequired: number;
    numErrors: number;
    numWarnings: number;
};

/**
 * Returns the status entries to display, most severe first. Equal statuses from several contributors are shown
 * once - preferring one that can be retried. While loading, only statuses that require action are shown, since
 * the final status can't be determined yet.
 */
export function makeDisplayedStatusEntries(statusEntries: readonly StatusEntry[], isLoading: boolean): StatusEntry[] {
    const entriesByIdentity = new Map<string, StatusEntry>();
    for (const entry of statusEntries) {
        if (isLoading && entry.category !== StatusCategory.ACTION_REQUIRED) {
            continue;
        }

        const existingEntry = entriesByIdentity.get(entry.identity);
        if (!existingEntry || (!existingEntry.canRetry && entry.canRetry)) {
            entriesByIdentity.set(entry.identity, entry);
        }
    }

    return Array.from(entriesByIdentity.values()).sort(function compareSeverity(a, b) {
        return CATEGORY_DISPLAY_ORDER.indexOf(a.category) - CATEGORY_DISPLAY_ORDER.indexOf(b.category);
    });
}

/**
 * Counts the unacknowledged entries per kind. Data errors and retryable errors both count as errors.
 */
export function countStatusEntries(statusEntries: readonly StatusEntry[]): StatusCounts {
    const counts: StatusCounts = { numActionRequired: 0, numErrors: 0, numWarnings: 0 };
    for (const entry of statusEntries) {
        if (entry.acknowledged) {
            continue;
        }
        if (entry.category === StatusCategory.ACTION_REQUIRED) {
            counts.numActionRequired++;
        } else if (entry.category === StatusCategory.WARNING) {
            counts.numWarnings++;
        } else {
            counts.numErrors++;
        }
    }
    return counts;
}
