import React from "react";

import type { Options } from "@hey-api/client-axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { postConcatenate, postConcatenateQueryKey, type PostConcatenateData_api, type ProgressInfo_api } from "@api";
import { wrapLongRunningQuery } from "@framework/utils/longRunningApiCalls";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Input } from "@lib/components/Input";
import { Switch } from "@lib/components/Switch";

export function View(): React.ReactNode {
    const [progress, setProgress] = React.useState<ProgressInfo_api | undefined>(undefined);
    const [a, setA] = React.useState<string>("b");
    const [b, setB] = React.useState<string>("c");
    const [delay, setDelay] = React.useState<number>(10);
    const [fail, setFail] = React.useState<boolean>(false);
    const [options, setOptions] = React.useState<Options<PostConcatenateData_api, false>>({
        query: {
            a: "b",
            b: "c",
            delay: 10,
        },
        body: {
            large_array: [],
        },
    });
    const [queryKey, setQueryKey] = React.useState<unknown[]>(postConcatenateQueryKey(options));

    const wrapped = wrapLongRunningQuery({
        queryFn: postConcatenate,
        queryFnArgs: options,
        queryKey,
        pollIntervalMs: 2000,
        maxRetries: 50,
        onProgress: (progress) => {
            setProgress(progress);
        },
    });

    const queryClient = useQueryClient();
    const result = useQuery({ ...wrapped });

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        const newDelay = value ? parseInt(value, 10) : 10;
        setDelay(newDelay);
    }

    function handleButtonClick() {
        queryClient.invalidateQueries({
            queryKey,
            refetchType: "all",
        });
        const newOptions: Options<PostConcatenateData_api, false> = {
            query: {
                a: a,
                b: b,
                delay: delay,
                fail: fail,
            },
            body: {
                large_array: [],
            },
        };
        setQueryKey(postConcatenateQueryKey(newOptions));
        setOptions(newOptions);
    }

    return (
        <div className="w-full h-full flex flex-col gap-2">
            <h2 className="font-bold">Request</h2>
            <table>
                <tbody>
                    <tr>
                        <td>A:</td>
                        <td>
                            <Input type="text" defaultValue={a} onChange={(e) => setA(e.target.value)} />
                        </td>
                    </tr>
                    <tr>
                        <td>B:</td>
                        <td>
                            <Input type="text" defaultValue={b} onChange={(e) => setB(e.target.value)} />
                        </td>
                    </tr>
                    <tr>
                        <td>Delay:</td>
                        <td>
                            <Input type="number" defaultValue={delay} onChange={handleInputChange} endAdornment="s" />
                        </td>
                    </tr>
                    <tr>
                        <td>Let task fail:</td>
                        <td>
                            <Switch checked={fail} onChange={(e) => setFail(e.target.checked)} />
                        </td>
                    </tr>
                </tbody>
            </table>
            <Button onClick={handleButtonClick} variant="contained">
                Start
            </Button>
            <h2 className="mt-4 font-bold">Response</h2>
            <table>
                <tbody>
                    <tr>
                        <td>Loading:</td>
                        <td>{result.isFetching ? <CircularProgress /> : null}</td>
                    </tr>
                    <tr>
                        <td>Progress:</td>
                        <td>{!result.isFetching ? "" : progress?.progress_message}</td>
                    </tr>
                    <tr>
                        <td>Error:</td>
                        <td className="text-red-600">{result.error ? result.error.message : null}</td>
                    </tr>
                    <tr>
                        <td>Data:</td>
                        <td>{result.data && !result.isFetching ? JSON.stringify(result.data) : "No data"}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
