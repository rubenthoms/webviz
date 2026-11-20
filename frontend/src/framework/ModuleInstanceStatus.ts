/**
 * The category of a status decides how it is shown in the module's banners and which actions are offered.
 */
export enum StatusCategory {
    /** The user must change the settings. Can't be dismissed */
    ACTION_REQUIRED = "ACTION_REQUIRED",
    /** The data can't be shown. Stays until the cause is resolved */
    DATA_ERROR = "DATA_ERROR",
    /** A transient failure, e.g. a network error or rate limit. Can be retried or dismissed */
    RETRYABLE_ERROR = "RETRYABLE_ERROR",
    /** The data is shown, but is affected by something the user should know about. Can be acknowledged */
    WARNING = "WARNING",
}

/**
 * Identifies the contributor of a group of statuses, e.g. `["view"]` or `["settings", "realizationFilter"]`.
 * Each report from a contributor replaces all statuses in its group.
 */
export type StatusGroupKey = readonly string[];

export type StatusAdditionalInfo = Readonly<Record<string, string | number>>;

export type Status = {
    category: StatusCategory;
    message: string;
    /**
     * Used instead of the message to identify the status when it is acknowledged.
     * Set it to make a status show up again after being acknowledged, e.g. when the same request fails again.
     */
    key?: string;
    /** Retries the failed operation. Only used for `RETRYABLE_ERROR` */
    retry?: () => void;
    /** Details shown in the status overview, e.g. HTTP status code or endpoint */
    additionalInfo?: StatusAdditionalInfo;
};
