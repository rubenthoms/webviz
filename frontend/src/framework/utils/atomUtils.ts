import type { DefaultError, QueryClient, QueryKey, QueryObserverResult } from "@tanstack/query-core";
import type { DefinedInitialDataOptions, UndefinedInitialDataOptions } from "@tanstack/react-query";

import type { Atom, Getter } from "jotai";
import { atom } from "jotai";
import type { AtomWithQueryOptions } from "jotai-tanstack-query";
import { atomWithQuery } from "jotai-tanstack-query";
import { atomWithReducer } from "jotai/utils";

export function atomWithCompare<Value>(initialValue: Value, areEqualFunc: (prev: Value, next: Value) => boolean) {
    return atomWithReducer(initialValue, (prev: Value, next: Value) => {
        if (areEqualFunc(prev, next)) {
            return prev;
        }

        return next;
    });
}

type QueriesOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
> = ((
    get: Getter,
) =>
    | DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
    | UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>
    | AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey>)[];

export function atomWithQueries<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
    TCombinedResult = QueryObserverResult<TData, TError>[],
>(
    getOptions: (get: Getter) => {
        queries: readonly [...QueriesOptions<TQueryFnData, TError, TData, TQueryKey>];
        combine?: (result: QueryObserverResult<TData, TError>[]) => TCombinedResult;
    },
    getQueryClient?: (get: Getter) => QueryClient,
): Atom<TCombinedResult> {
    const optionsAtom = atom(getOptions);
    const atoms = atom((get) => {
        const options = get(optionsAtom);

        const queries = options.queries.map((option) => {
            return atomWithQuery<TQueryFnData, TError, TData, TQueryKey>(option, getQueryClient);
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
    value: T;
    isPersisted: boolean;
};

export function isPersistableAtomValue<T>(value: T | PersistableAtomValue<T>): value is PersistableAtomValue<T> {
    return value && typeof value === "object" && "value" in value && "isPersistedValue" in value;
}

export function persistableAtom<T>(initialValue: T, areEqual?: (prev: T, next: T) => boolean) {
    function adjustedAreEqual(prev: PersistableAtomValue<T>, next: PersistableAtomValue<T>) {
        if (areEqual) {
            return areEqual(prev.value, next.value);
        }
        // Used by Jotai by default
        return Object.is(prev.value, next.value);
    }

    const stateHolderAtom = atomWithCompare<PersistableAtomValue<T>>(
        { value: initialValue, isPersisted: false },
        adjustedAreEqual,
    );

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

            set(stateHolderAtom, { value: newValue, isPersisted: false });
        },
    );
}
