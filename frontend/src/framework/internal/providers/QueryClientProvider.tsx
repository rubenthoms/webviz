import React from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Provider } from "jotai";

import { toastManager } from "@framework/toastManager";
import { tanstackDebugTimeOverride } from "@framework/utils/debug";

import { HydrateQueryClientAtom } from "../components/HydrateQueryClientAtom";
import { QueryStatusManager } from "../QueryStatusManager";

export const CustomQueryClientProvider: React.FC<{ children: React.ReactElement }> = (props) => {
    const queryClientRef = React.useRef<QueryClient>(
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    refetchOnWindowFocus: false,
                    refetchOnMount: false,
                    refetchOnReconnect: true,
                    gcTime: tanstackDebugTimeOverride(1000 * 60), // 1 minute
                    staleTime: tanstackDebugTimeOverride(1000 * 60), // 1 minute
                },
            },
        }),
    );

    React.useEffect(function subscribeToQueryStatus() {
        const manager = new QueryStatusManager(queryClientRef.current, toastManager);
        return manager.subscribe();
    }, []);

    return (
        <QueryClientProvider client={queryClientRef.current}>
            <Provider>
                <HydrateQueryClientAtom>{props.children}</HydrateQueryClientAtom>
            </Provider>
            <ReactQueryDevtools initialIsOpen={false} key="react-query-devtools" />
        </QueryClientProvider>
    );
};
