import {
    QueryClient,
    type QueryKey,
    QueryObserver,
    type QueryObserverResult,
    notifyManager,
} from "@tanstack/query-core";
import { Getter, WritableAtom, atom } from "jotai";
import { queryClientAtom } from "./_queryClientAtom";
import { BaseAtomWithQueryOptions } from "./types";
import { ensureStaleTime, getHasError, shouldSuspend } from "./utils";

export function baseAtomWithQuery<TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey>(
    getOptions: (get: Getter) => BaseAtomWithQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
    Observer: typeof QueryObserver,
    getQueryClient: (get: Getter) => QueryClient = (get) => get(queryClientAtom),
): WritableAtom<QueryObserverResult<TData, TError> | Promise<QueryObserverResult<TData, TError>>, [], void> {
    const refreshAtom = atom(0);
    const clientAtom = atom(getQueryClient);
    if (process.env.NODE_ENV !== "production") {
        clientAtom.debugPrivate = true;
    }

    const observerCacheAtom = atom(
        () => new WeakMap<QueryClient, QueryObserver<TQueryFnData, TError, TData, TQueryData, TQueryKey>>(),
    );
    if (process.env.NODE_ENV !== "production") {
        observerCacheAtom.debugPrivate = true;
    }

    const defaultedOptionsAtom = atom((get) => {
        const client = get(clientAtom);
        const options = getOptions(get);
        const defaultedOptions = client.defaultQueryOptions(options);

        const cache = get(observerCacheAtom);
        const cachedObserver = cache.get(client);

        defaultedOptions._optimisticResults = "optimistic";

        if (cachedObserver) {
            const queryKey = JSON.stringify(defaultedOptions.queryKey);
            const listeners = (cachedObserver as any).listeners?.size || 0;
            console.log(`[defaultedOptionsAtom] queryKey: ${queryKey}, listeners: ${listeners}, calling setOptions`);
            cachedObserver.setOptions(defaultedOptions);
        }

        return ensureStaleTime(defaultedOptions);
    });
    if (process.env.NODE_ENV !== "production") {
        defaultedOptionsAtom.debugPrivate = true;
    }

    const observerAtom = atom((get) => {
        const client = get(clientAtom);
        const defaultedOptions = get(defaultedOptionsAtom);

        const observerCache = get(observerCacheAtom);

        const cachedObserver = observerCache.get(client);

        if (cachedObserver) return cachedObserver;

        const newObserver = new Observer(client, defaultedOptions);
        observerCache.set(client, newObserver);

        return newObserver;
    });
    if (process.env.NODE_ENV !== "production") {
        observerAtom.debugPrivate = true;
    }

    const dataAtom = atom((get) => {
        const observer = get(observerAtom);
        const defaultedOptions = get(defaultedOptionsAtom);
        const result = observer.getOptimisticResult(defaultedOptions);

        const resultAtom = atom(result);
        if (process.env.NODE_ENV !== "production") {
            resultAtom.debugPrivate = true;
        }

        resultAtom.onMount = (set) => {
            const queryKey = JSON.stringify(defaultedOptions.queryKey);
            const listeners = (observer as any).listeners?.size || 0;
            console.log(`[resultAtom.onMount] queryKey: ${queryKey}, listeners BEFORE subscribe: ${listeners}`);

            const unsubscribe = observer.subscribe(notifyManager.batchCalls(set));

            const listenersAfter = (observer as any).listeners?.size || 0;
            console.log(`[resultAtom.onMount] queryKey: ${queryKey}, listeners AFTER subscribe: ${listenersAfter}`);

            return () => {
                const listenersBefore = (observer as any).listeners?.size || 0;
                console.log(
                    `[resultAtom.unmount] queryKey: ${queryKey}, listeners BEFORE unsubscribe: ${listenersBefore}`,
                );

                if (observer.getCurrentResult().isError) {
                    observer.getCurrentQuery().reset();
                }

                // This destroys the observer if it does not have any other listeners - and CANCELS ONGOING FETCHES!
                unsubscribe();

                const listenersAfterUnsub = (observer as any).listeners?.size || 0;
                console.log(
                    `[resultAtom.unmount] queryKey: ${queryKey}, listeners AFTER unsubscribe: ${listenersAfterUnsub}`,
                );
            };
        };

        return resultAtom;
    });
    if (process.env.NODE_ENV !== "production") {
        dataAtom.debugPrivate = true;
    }

    return atom(
        (get) => {
            get(refreshAtom);
            const observer = get(observerAtom);
            const defaultedOptions = get(defaultedOptionsAtom);

            const result = get(get(dataAtom));

            if (shouldSuspend(defaultedOptions, result, false)) {
                return observer.fetchOptimistic(defaultedOptions);
            }

            if (
                getHasError({
                    result,
                    query: observer.getCurrentQuery(),
                    throwOnError: defaultedOptions.throwOnError,
                })
            ) {
                throw result.error;
            }

            return result;
        },
        (_get, set) => {
            set(refreshAtom, (c) => c + 1);
        },
    );
}
