import type { Query, QueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import type { EnsembleSet } from "@framework/EnsembleSet";
import { ApiErrorHelper } from "@framework/utils/ApiErrorHelper";
import { formatEnsembleIdentifiersInMessage } from "@framework/utils/formatEnsembleIdentifiersInMessage";
import type { ToastManager } from "@lib/components/Toast";

const TIMEOUT_MESSAGE = "The request timed out. Please try again.";
const REQUEST_FAILED_MESSAGE = "Could not load the requested data.";

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 429, 502, 503, 504]);

const HTTP_ERROR_MESSAGES: Partial<Record<number, string>> = {
    401: "Your session may have expired. Please sign in again.",
    403: "You do not have permission to access the requested data.",
    408: TIMEOUT_MESSAGE,
    429: "Too many requests. Please wait a moment before retrying.",
    504: TIMEOUT_MESSAGE,
};

type FailureNotification = {
    errorUpdateCount: number;
    toastId?: string;
};

export class QueryStatusManager {
    private readonly _notifications = new Map<Query, FailureNotification>();

    constructor(
        private readonly _queryClient: QueryClient,
        private readonly _toastManager: Pick<ToastManager, "add" | "close">,
        private readonly _getEnsembleSet: () => EnsembleSet | null,
    ) {}

    subscribe(): () => void {
        const cache = this._queryClient.getQueryCache();
        const reconcile = this.reconcile.bind(this);
        const removeNotification = this.removeNotification.bind(this);
        const notifications = this._notifications;

        const unsubscribe = cache.subscribe(function handleQueryCacheEvent(event) {
            if (event.type === "removed") {
                removeNotification(event.query);
                return;
            }
            reconcile(event.query);
        });

        for (const query of cache.getAll()) {
            reconcile(query);
        }

        return function unsubscribeQueryStatus() {
            unsubscribe();
            for (const query of notifications.keys()) {
                removeNotification(query);
            }
        };
    }

    private reconcile(query: Query): void {
        if (!query.isActive() || query.state.status !== "error") {
            this.removeNotification(query);
            return;
        }

        const previous = this._notifications.get(query);

        if (query.state.fetchStatus !== "idle") {
            if (previous?.toastId) {
                this._toastManager.close(previous.toastId);
                previous.toastId = undefined;
            }
            return;
        }

        if (previous?.errorUpdateCount === query.state.errorUpdateCount) {
            return;
        }

        this.removeNotification(query);

        const notification: FailureNotification = {
            errorUpdateCount: query.state.errorUpdateCount,
        };
        this._notifications.set(query, notification);

        const queryClient = this._queryClient;

        notification.toastId = this._toastManager.add({
            title: formatEnsembleIdentifiersInMessage(makeQueryErrorMessage(query.state.error), this._getEnsembleSet()),
            type: "error",
            timeout: 8000,
            actionProps: canRetryQueryError(query.state.error)
                ? {
                      children: "Retry",
                      onClick: function retryFailedQuery() {
                          if (
                              cacheContainsQuery(queryClient, query) &&
                              query.isActive() &&
                              query.state.status === "error" &&
                              query.state.fetchStatus === "idle" &&
                              canRetryQueryError(query.state.error)
                          ) {
                              void queryClient.refetchQueries(
                                  { predicate: (candidate) => candidate === query },
                                  { cancelRefetch: false },
                              );
                          }
                      },
                  }
                : undefined,
        });
    }

    private removeNotification(query: Query): void {
        const notification = this._notifications.get(query);
        if (notification?.toastId) {
            this._toastManager.close(notification.toastId);
        }
        this._notifications.delete(query);
    }
}

function canRetryQueryError(error: Error | null): boolean {
    if (!error) {
        return false;
    }

    const transportError = isAxiosError(error) ? error : error.cause;
    if (!isAxiosError(transportError) || transportError.code === "ERR_CANCELED") {
        return false;
    }

    const status = transportError.response?.status ?? transportError.status;
    if (status !== undefined) {
        return RETRYABLE_HTTP_STATUS_CODES.has(status);
    }

    return (
        transportError.code === "ERR_NETWORK" ||
        transportError.code === "ECONNABORTED" ||
        transportError.code === "ETIMEDOUT"
    );
}

function makeQueryErrorMessage(error: Error | null): string {
    if (!error) {
        return REQUEST_FAILED_MESSAGE;
    }

    const helper = ApiErrorHelper.fromError(error);
    const backendMessage = helper?.getMessage()?.trim();
    if (backendMessage) {
        return backendMessage;
    }

    const status = helper?.getStatusCode();
    if (status !== null && status !== undefined) {
        const message = HTTP_ERROR_MESSAGES[status];
        if (message) {
            return message;
        }
        if (status === 502 || status === 503) {
            return "The service is temporarily unavailable. Please try again shortly.";
        }
        if (status >= 500) {
            return "The server could not load the requested data.";
        }
    }

    const transportError = isAxiosError(error) ? error : error.cause;
    if (isAxiosError(transportError)) {
        if (transportError.code === "ERR_NETWORK") {
            return "Could not reach the server. Check your connection and try again.";
        }
        if (transportError.code === "ECONNABORTED" || transportError.code === "ETIMEDOUT") {
            return TIMEOUT_MESSAGE;
        }
        return REQUEST_FAILED_MESSAGE;
    }

    return error.message || REQUEST_FAILED_MESSAGE;
}

function cacheContainsQuery(client: QueryClient, query: Query): boolean {
    return client.getQueryCache().get(query.queryHash) === query;
}
