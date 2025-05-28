import {
    client,
    type HttpValidationError_api,
    type LroErrorResp_api,
    type LroInProgressResp_api,
    type ProgressInfo_api,
} from "@api";
import type { RequestResult } from "@hey-api/client-axios";
import type { QueryFunctionContext } from "@tanstack/query-core";
import type { UseQueryOptions } from "@tanstack/react-query";

type LongRunningApiResponse<TData> =
    | LroInProgressResp_api
    | LroErrorResp_api
    | {
          status: "success";
          data: TData;
      };

function isLongRunningApiErrorResponse(response: unknown): response is LroErrorResp_api {
    return response !== null && typeof response === "object" && "status" in response && response.status === "failure";
}

type QueryFn<TArgs, TData> = (
    options: TArgs,
) => RequestResult<LongRunningApiResponse<TData>, LroErrorResp_api | HttpValidationError_api, false>;

interface WrapLongRunningQueryArgs<TArgs, TData> {
    queryFn: QueryFn<TArgs, TData>;
    queryFnArgs: TArgs;
    queryKey: unknown[];
    pollIntervalMs?: number;
    maxRetries?: number;
    onProgress?: (progress: ProgressInfo_api | undefined) => void;
}

interface OnProgressCallback {
    (progress: ProgressInfo_api | undefined): void;
}

async function pollUntilDone<T>(options: {
    pollUrl: string;
    operationId: string;
    intervalMs: number;
    maxRetries: number;
    signal?: AbortSignal;
    onProgress?: OnProgressCallback;
}): Promise<T> {
    const { pollUrl, intervalMs, maxRetries, signal, onProgress } = options;
    let currentPollUrl = pollUrl;

    for (let i = 0; i < maxRetries; i++) {
        if (signal?.aborted) {
            throw new Error("Polling aborted");
        }

        const response = await client.get<LongRunningApiResponse<T>, HttpValidationError_api | LroErrorResp_api, false>(
            {
                url: currentPollUrl,
                signal,
            },
        );

        const { data, error } = response;

        if (error) {
            const errorResponse = response.response;
            if (errorResponse && errorResponse.data) {
                const errorData = errorResponse.data as HttpValidationError_api | LroErrorResp_api;
                if (isLongRunningApiErrorResponse(errorData)) {
                    throw new Error(errorData.error?.message || "Unknown error");
                }
            }
            throw error;
        }

        if (data.status === "success") {
            return data.data as T;
        } else if (data.status === "failure") {
            throw new Error(data.error?.message || "Unknown error");
        }

        if (data.status === "in_progress") {
            if (!data.poll_url) {
                throw new Error("Missing poll_url in in_progress response");
            }
            currentPollUrl = data.poll_url;
            onProgress?.(data.progress ?? undefined);
        }

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, intervalMs);

            const onAbort = () => {
                clearTimeout(timeout);
                reject(new Error("Polling aborted during wait"));
            };

            signal?.addEventListener("abort", onAbort, { once: true });

            if (signal) {
                // Ensure cleanup in case timeout wins
                setTimeout(() => {
                    signal.removeEventListener("abort", onAbort);
                }, intervalMs + 100); // Just after the timeout
            }
        });
    }

    throw new Error("Polling timed out");
}

export function wrapLongRunningQuery<TArgs, TData, TQueryKey extends readonly unknown[]>({
    queryFn,
    queryFnArgs,
    queryKey,
    pollIntervalMs = 2000,
    maxRetries = 50,
    onProgress,
}: WrapLongRunningQueryArgs<TArgs, TData> & { queryKey: TQueryKey }): UseQueryOptions<TData, Error, TData, TQueryKey> {
    return {
        queryKey,
        queryFn: async (ctx: QueryFunctionContext<TQueryKey>) => {
            const signal = ctx.signal;

            const response = await queryFn({ ...queryFnArgs, signal, throwOnError: false });
            const { data: result, error } = response;

            if (error) {
                const errorResponse = response.response;
                if (errorResponse && errorResponse.data) {
                    const errorData = errorResponse.data as HttpValidationError_api | LroErrorResp_api;
                    if (isLongRunningApiErrorResponse(errorData)) {
                        throw new Error(errorData.error?.message || "Unknown error");
                    }
                }
                throw error;
            }

            if (result.status === "success") {
                if (result.data === undefined) {
                    throw new Error("Missing data in successful response");
                }
                return result.data;
            } else if (result.status === "in_progress" && result.poll_url && result.operation_id) {
                return pollUntilDone<TData>({
                    pollUrl: result.poll_url,
                    intervalMs: pollIntervalMs,
                    maxRetries,
                    signal,
                    onProgress,
                    operationId: result.operation_id,
                });
            }
            if (result.status === "failure") {
                throw new Error(result.error?.message || "Unknown error");
            }

            throw new Error("Invalid response status or missing poll_url");
        },
    };
}
