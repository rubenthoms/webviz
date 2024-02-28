import React from "react";

import { GuiDisplayMessageType, GuiEvent, GuiMessageBroker } from "@framework/GuiMessageBroker";
import { Query, QueryCache, QueryClient, QueryClientProvider, QueryKey } from "@tanstack/react-query";
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

function getMessageFromError(error: QueryError): string {
    if (typeof error.body !== "object") {
        return error.statusText;
    }
    if (typeof error.body.error !== "object") {
        return error.body as unknown as string;
    }
    return error.body.error.message;
}

function getErrorTypeFromError(error: QueryError): string {
    if (typeof error.body !== "object") {
        return error.name;
    }
    if (typeof error.body.error !== "object") {
        return error.name;
    }
    return error.body.error.type;
}

export const CustomQueryClientProvider: React.FC<CustomQueryClientProviderProps> = (props) => {
    const authProvider = useAuthProvider();

    function handleError(error: Error, query: Query<unknown, unknown, unknown, QueryKey>) {
        if (typeof error !== "object") {
            return;
        }

        if ("status" in error === false) {
            return;
        }

        // We can expect that this is a QueryError
        const queryError = error as unknown as QueryError;

        if (queryError.status === 401) {
            authProvider.setAuthState(AuthState.NotLoggedIn);
            return;
        }

        if (queryError.status === 500) {
            const errorMessage = (
                <div className="flex flex-col gap-2 items-start">
                    <strong>{getErrorTypeFromError(queryError)}</strong>
                    {getMessageFromError(queryError)}
                    <span className="text-xs">{queryError.url}</span>
                </div>
            );
            props.guiMessageBroker.publishEvent(GuiEvent.DisplayMessageRequest, {
                type: GuiDisplayMessageType.Error,
                message: errorMessage,
            });
        }
    }

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
                onError: handleError,
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
