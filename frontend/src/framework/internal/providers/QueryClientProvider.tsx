import React from "react";

import { GuiDisplayMessageType, GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthState, useAuthProvider } from "./AuthProvider";

type QueryError = {
    url: string;
    status: number;
    statusText: string;
    body: {
        error: {
            type: string;
            message: string;
        };
    };
    request: unknown;
    name: string;
};

export type CustomQueryClientProviderProps = {
    guiMessageBroker: GuiMessageBroker;
    children: React.ReactElement;
};

export const CustomQueryClientProvider: React.FC<CustomQueryClientProviderProps> = (props) => {
    const authProvider = useAuthProvider();

    const queryClient = React.useRef<QueryClient>(
        new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false,
                    refetchOnWindowFocus: false,
                    refetchOnMount: false,
                    refetchOnReconnect: true,
                    gcTime: 0,
                },
            },
            queryCache: new QueryCache({
                onError: (error, query) => {
                    if (error && (error as unknown as QueryError).status === 401) {
                        authProvider.setAuthState(AuthState.NotLoggedIn);
                        return;
                    }
                    if (error && (error as unknown as QueryError).status === 500) {
                        props.guiMessageBroker.publishEvent(GuiEvent.DisplayMessageRequest, {
                            type: GuiDisplayMessageType.Error,
                            message: (error as unknown as QueryError).body.error.message,
                        });
                    }
                },
            }),
        })
    );

    return (
        <QueryClientProvider client={queryClient.current}>
            {props.children}
            <ReactQueryDevtools initialIsOpen={false} key="react-query-devtools" />
        </QueryClientProvider>
    );
};
