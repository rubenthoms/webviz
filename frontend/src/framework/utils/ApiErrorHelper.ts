import type { UseQueryResult } from "@tanstack/react-query";
import type { InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";
import { isObject } from "lodash-es";

import { Origin } from "@framework/ModuleInstanceStatusController";
import type { StatusMessage } from "@framework/ModuleInstanceStatusController";

const TIMEOUT_MESSAGE = "The request timed out. Please try again.";
const REQUEST_FAILED_MESSAGE = "Could not load the requested data.";

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 429, 502, 503, 504]);
const RETRYABLE_ERROR_CODES = new Set<string>([AxiosError.ERR_NETWORK, AxiosError.ECONNABORTED, AxiosError.ETIMEDOUT]);

const HTTP_ERROR_MESSAGES: Partial<Record<number, string>> = {
    401: "Your session may have expired. Please sign in again.",
    403: "You do not have permission to access the requested data.",
    408: TIMEOUT_MESSAGE,
    429: "Too many requests. Please wait a moment before retrying.",
    502: "The service is temporarily unavailable. Please try again shortly.",
    503: "The service is temporarily unavailable. Please try again shortly.",
    504: TIMEOUT_MESSAGE,
};

export class ApiErrorHelper {
    private _error: AxiosError;
    private _statusCode: number | undefined;
    private _endpoint: string;
    private _requestConfig: InternalAxiosRequestConfig | undefined;
    private _service: string | null = null;
    private _type: string | null = null;
    private _message: string | null = null;

    private constructor(readonly error: AxiosError) {
        this._error = error;
        this._statusCode = error.status;
        this._endpoint = error.config?.url ?? "Unknown endpoint";
        this._requestConfig = error.config;
        this.extractInfoFromErrorBody(error);
    }

    static fromQueryResult(queryResult: UseQueryResult<any>): ApiErrorHelper | null {
        if (!queryResult.error || !(queryResult.error instanceof AxiosError)) {
            return null;
        }
        return new ApiErrorHelper(queryResult.error);
    }

    static fromError(error: Error): ApiErrorHelper | null {
        if (error instanceof AxiosError) {
            return new ApiErrorHelper(error);
        }

        if (error.cause && error.cause instanceof AxiosError) {
            return new ApiErrorHelper(error.cause);
        }

        return null;
    }

    private extractInfoFromErrorBody(apiError: AxiosError): void {
        if (!apiError.response?.data || typeof apiError.response.data !== "object") {
            return;
        }

        const data = apiError.response.data;

        if (!("error" in data)) {
            return;
        }

        const error = data.error;

        if (!isObject(error)) {
            return;
        }

        if ("url" in apiError) {
            this._endpoint = apiError.config?.url ?? "Unknown endpoint";
        }

        if ("type" in error && typeof error.type === "string") {
            this._type = error.type;
        }

        if ("message" in error && typeof error.message === "string") {
            this._message = error.message;
        }

        if ("service" in error && typeof error.service === "string") {
            this._service = error.service;
        }

        if (!("type" in error) || !("message" in error)) {
            return;
        }
    }

    hasError(): boolean {
        return this._error !== null;
    }

    getService(): string | null {
        return this._service;
    }

    getType(): string | null {
        return this._type;
    }

    getMessage(): string | null {
        return this._message;
    }

    getStatusCode(): number | null {
        return this._statusCode ?? null;
    }

    getEndPoint(): string {
        return this._endpoint;
    }

    getRequestConfig(): InternalAxiosRequestConfig | undefined {
        return this._requestConfig;
    }

    isCancelled(): boolean {
        return this._error.code === AxiosError.ERR_CANCELED;
    }

    isRetryable(): boolean {
        if (this.isCancelled()) {
            return false;
        }

        const status = this.getResponseStatus();
        if (status !== null) {
            return RETRYABLE_HTTP_STATUS_CODES.has(status);
        }

        return this._error.code !== undefined && RETRYABLE_ERROR_CODES.has(this._error.code);
    }

    makeUserFacingMessage(): string {
        const backendMessage = this._message?.trim();
        if (backendMessage) {
            return backendMessage;
        }

        const status = this.getResponseStatus();
        if (status !== null) {
            const message = HTTP_ERROR_MESSAGES[status];
            if (message) {
                return message;
            }
            if (status >= 500) {
                return "The server could not load the requested data.";
            }
        }

        if (this._error.code === AxiosError.ERR_NETWORK) {
            return "Could not reach the server. Check your connection and try again.";
        }
        if (this._error.code === AxiosError.ECONNABORTED || this._error.code === AxiosError.ETIMEDOUT) {
            return TIMEOUT_MESSAGE;
        }

        return REQUEST_FAILED_MESSAGE;
    }

    private getResponseStatus(): number | null {
        return this._error.response?.status ?? this._statusCode ?? null;
    }

    makeFullErrorMessage(): string {
        let errorMessage = "";
        if (this.hasError()) {
            const additionalInformation: string[] = [];
            if (this.getService()) {
                additionalInformation.push(`${this.getService()?.toUpperCase()}`);
            }
            if (this.getType()) {
                additionalInformation.push(`${this.getType()}`);
            }
            if (this.getStatusCode()) {
                additionalInformation.push(`${this.getStatusCode()}`);
            }
            errorMessage = `${this.getMessage() ?? "Unknown error"} (${additionalInformation.join(", ")})`;
        }

        return errorMessage;
    }

    makeStatusMessage(): StatusMessage {
        return {
            message: this.makeFullErrorMessage(),
            origin: Origin.API,
            endpoint: this.getEndPoint(),
            request: this.getRequestConfig(),
        };
    }
}
