import { DefaultError, QueryClient, QueryKey, QueryObserverOptions, QueryObserverResult } from "@tanstack/query-core";

import { Atom, Getter, atom } from "jotai";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomWithReducer } from "jotai/utils";

export function atomWithCompare<Value>(initialValue: Value, areEqual: (prev: Value, next: Value) => boolean) {
    return atomWithReducer(initialValue, (prev: Value, next: Value) => {
        if (areEqual(prev, next)) {
            return prev;
        }

        return next;
    });
}

type QueriesOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey
> = ((get: Getter) => Omit<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>, "suspense">)[];

export function atomWithQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TCombinedResult = QueryObserverResult<TData, TError>[]
>(
    getOptions: (get: Getter) => {
        queries: readonly [...QueriesOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>];
        combine?: (result: QueryObserverResult<TData, TError>[]) => TCombinedResult;
    },
    getQueryClient?: (get: Getter) => QueryClient
): Atom<TCombinedResult> {
    const optionsAtom = atom(getOptions);
    const atoms = atom((get) => {
        const options = get(optionsAtom);

        const queries = options.queries.map((option) => {
            return atomWithQuery<TQueryFnData, TError, TData, TQueryData, TQueryKey>(option, getQueryClient);
        });

        return queries;
    });
    return atom((get) => {
        const options = get(optionsAtom);
        const results = get(atoms).map((atom) => get(atom));

        if (options.combine) {
            return options.combine(results) as TCombinedResult;
        }

        return results as TCombinedResult;
    });
}

export type PersistableAtomValue<T> = {
    state: T;
    isPersistedState: boolean;
};

export function isPersistableAtomValue<T>(value: T | PersistableAtomValue<T>): value is PersistableAtomValue<T> {
    return value && typeof value === "object" && "state" in value && "isPersistedState" in value;
}

export function persistableAtom<T>(initialValue: T) {
    const stateHolderAtom = atom<PersistableAtomValue<T>>({ state: initialValue, isPersistedState: false });

    return atom(
        (get) => {
            const stateHolder = get(stateHolderAtom);
            return stateHolder;
        },
        (_, set, newValue: T | PersistableAtomValue<T>) => {
            if (isPersistableAtomValue(newValue)) {
                set(stateHolderAtom, newValue);
                return;
            }

            set(stateHolderAtom, { state: newValue, isPersistedState: false });
        }
    );
}
