import React from "react";

import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";

import { client } from "@api";
import { Button } from "@lib/components/Button";
import { Combobox } from "@lib/components/Combobox";
import { NumberInput } from "@lib/components/NumberInput";
import { Setting } from "@lib/components/Setting";
import { SwitchCompositions } from "@lib/components/Switch/compositions";

const ERROR_TYPES = [
    "NoError",
    "HttpException",
    "AuthorizationError",
    "NoDataError",
    "InvalidParameterError",
    "ServiceRateLimitError",
    "ServiceUnavailableError",
    "ServiceTimeoutError",
    "InvalidDataError",
    "MultipleDataMatchesError",
    "ServiceRequestError",
    "TypeError",
    "ValueError",
    "NestedValueError",
];

type ErrorRequest = {
    runId: number;
    errorType: string;
    statusCode: number;
};

export function View(): React.ReactNode {
    const instanceId = React.useId();
    const [errorType, setErrorType] = React.useState("ServiceUnavailableError");
    const [statusCode, setStatusCode] = React.useState(503);
    const [enabled, setEnabled] = React.useState(true);
    const [request, setRequest] = React.useState<ErrorRequest | null>(null);

    const query = useQuery({
        queryKey: ["dbg-query-errors", instanceId, request],
        queryFn: async function provokeBackendError({ signal }) {
            if (!request) {
                throw new Error("No debug request selected.");
            }
            const response = await client.get<string, unknown, true>({
                url: `/dev/provoke_error/${request.errorType}`,
                query: { status_code: request.statusCode },
                signal,
                throwOnError: true,
            });
            return { status: response.status, body: response.data };
        },
        enabled: enabled && request !== null,
        retry: false,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
        gcTime: 0,
    });

    function handleTrigger() {
        setRequest(function makeRequest(previous) {
            return {
                runId: (previous?.runId ?? 0) + 1,
                errorType,
                statusCode,
            };
        });
    }

    function handleErrorTypeChange(value: string | null) {
        if (value) {
            setErrorType(value);
        }
    }

    function handleStatusCodeChange(value: number | null) {
        setStatusCode(value ?? 503);
    }

    const responseStatus = isAxiosError(query.error) ? query.error.response?.status : query.data?.status;
    const responseBody = isAxiosError(query.error)
        ? (query.error.response?.data ?? query.error.message)
        : (query.error?.message ?? query.data?.body);

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Backend error scenario" defaultOpen>
                    <Setting.Field label="Error type" stacked>
                        <Combobox
                            items={ERROR_TYPES.map((value) => ({ value, label: value }))}
                            value={errorType}
                            onValueChange={handleErrorTypeChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="HTTP status for HttpException" stacked>
                        <NumberInput
                            value={statusCode}
                            onValueChange={handleStatusCodeChange}
                            min={400}
                            max={599}
                            disabled={errorType !== "HttpException"}
                        />
                    </Setting.Field>
                    <Setting.Field label="Query enabled">
                        <SwitchCompositions.WithLabel
                            checked={enabled}
                            onCheckedChange={setEnabled}
                            label="Keep an enabled query observer"
                        />
                    </Setting.Field>
                    <Button onClick={handleTrigger} disabled={!enabled || query.isFetching}>
                        Trigger request
                    </Button>
                    <p>
                        Retry repeats the selected request. Changing controls takes effect when you trigger a new
                        request.
                    </p>
                </Setting.Section>
                <Setting.Section title="Response" defaultOpen>
                    <p>
                        {!request
                            ? "No request sent."
                            : query.isFetching
                              ? "Request in flight."
                              : `Query: ${query.status}; HTTP: ${responseStatus ?? "no response"}`}
                    </p>
                    <pre className="break-words whitespace-pre-wrap">
                        {responseBody === undefined ? "" : JSON.stringify(responseBody, null, 2)}
                    </pre>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
