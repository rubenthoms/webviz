import type { Query, QueryClient } from "@tanstack/react-query";

import type { ToastManager } from "@lib/components/Toast";

type FailureNotification = {
    errorUpdateCount: number;
    toastId?: string;
};

export class QueryStatusManager {
    private readonly _notifications = new Map<Query, FailureNotification>();

    constructor(
        private readonly _queryClient: QueryClient,
        private readonly _toastManager: Pick<ToastManager, "add" | "close">,
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
            title: query.state.error?.message || "Request failed",
            type: "error",
            timeout: 8000,
            actionProps: {
                children: "Retry",
                onClick: function retryFailedQuery() {
                    if (
                        cacheContainsQuery(queryClient, query) &&
                        query.isActive() &&
                        query.state.status === "error" &&
                        query.state.fetchStatus === "idle"
                    ) {
                        void queryClient.refetchQueries(
                            { predicate: (candidate) => candidate === query },
                            { cancelRefetch: false },
                        );
                    }
                },
            },
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

function cacheContainsQuery(client: QueryClient, query: Query): boolean {
    return client.getQueryCache().get(query.queryHash) === query;
}
