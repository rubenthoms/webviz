import React from "react";

import { isEqual } from "lodash";

export function useValidArrayState<T>(options: {
    initialState: T[] | (() => T[]);
    validStateArray: readonly T[];
    keepStateWhenInvalid?: boolean;
}): [T[], (newState: T[] | ((prevState: T[]) => T[]), acceptInvalidState?: boolean) => void] {
    const [state, setState] = React.useState<T[]>(options.initialState);
    const [validState, setValidState] = React.useState<T[]>(options.initialState);

    const newValidState = state.filter((item) => options.validStateArray.includes(item));
    if (!isEqual(newValidState, state) && !options.keepStateWhenInvalid) {
        setState(newValidState);
    }

    if (!isEqual(newValidState, validState)) {
        setValidState(newValidState);
    }

    const stateSetter = React.useCallback(
        function setValidState(newState: T[] | ((prevState: T[]) => T[]), acceptInvalidState = true) {
            const computedNewState =
                typeof newState === "function" ? (newState as (prevState: T[]) => T[])(state) : newState;
            if (!acceptInvalidState) {
                setState(computedNewState.filter((item) => options.validStateArray.includes(item)));
            } else {
                setState(computedNewState);
            }
        },
        [state, options.validStateArray]
    );

    return [validState, stateSetter];
}
