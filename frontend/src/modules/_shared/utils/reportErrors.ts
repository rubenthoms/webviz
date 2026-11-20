import { CancelledError } from "@tanstack/react-query";

import type { AddStatusOptions, StatusWriter } from "@framework/StatusWriter";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";

/**
 * The parts of a query result needed to report its error, e.g. a `UseQueryResult` or `QueryObserverResult`.
 */
export type QueryResultWithError = {
    error: Error | null;
    errorUpdateCount: number;
    refetch: () => unknown;
};

/**
 * Reports the errors of query results. Retryable errors can be retried with the query's `refetch`, and show up
 * again after being dismissed when the query fails again.
 */
export function reportQueryErrors(statusWriter: StatusWriter, queryResults: readonly QueryResultWithError[]): void {
    for (const queryResult of queryResults) {
        if (!queryResult.error) {
            continue;
        }

        reportError(statusWriter, queryResult.error, makeRefetchRetry(queryResult), queryResult.errorUpdateCount);
    }
}

/**
 * Reports errors that are not attached to a query result, e.g. the errors of combined queries.
 * Without `retry`, retryable errors can only be dismissed.
 */
export function reportApiErrors(statusWriter: StatusWriter, errors: readonly Error[], retry?: () => void): void {
    for (const error of errors) {
        reportError(statusWriter, error, retry, null);
    }
}

function makeRefetchRetry(queryResult: QueryResultWithError): () => void {
    return function retryQuery() {
        queryResult.refetch();
    };
}

function reportError(
    statusWriter: StatusWriter,
    error: Error,
    retry: (() => void) | undefined,
    errorUpdateCount: number | null,
): void {
    if (error instanceof CancelledError) {
        return;
    }

    const apiErrorHelper = ApiErrorHelper.fromError(error);
    if (!apiErrorHelper) {
        statusWriter.addError(error.message || "An unknown error occurred.");
        return;
    }

    if (apiErrorHelper.isCancelled()) {
        return;
    }

    const message = apiErrorHelper.makeUserFacingMessage();
    const options: AddStatusOptions = {
        key: errorUpdateCount !== null ? `${message} (${errorUpdateCount})` : undefined,
        additionalInfo: makeAdditionalInfo(apiErrorHelper),
    };

    if (apiErrorHelper.isRetryable()) {
        statusWriter.addRetryableError(message, retry, options);
        return;
    }

    statusWriter.addError(message, options);
}

function makeAdditionalInfo(apiErrorHelper: ApiErrorHelper): Record<string, string | number> {
    const additionalInfo: Record<string, string | number> = {
        endpoint: apiErrorHelper.getEndPoint(),
    };

    const statusCode = apiErrorHelper.getStatusCode();
    if (statusCode !== null) {
        additionalInfo.statusCode = statusCode;
    }

    const service = apiErrorHelper.getService();
    if (service) {
        additionalInfo.service = service;
    }

    const type = apiErrorHelper.getType();
    if (type) {
        additionalInfo.type = type;
    }

    return additionalInfo;
}
