import React from "react";

import { useModuleInstanceReactContext } from "./internal/ModuleInstanceReactContext";
import { ModuleInstanceStatusWriter } from "./internal/ModuleInstanceStatusWriter";
import type { SettingsContext, ViewContext } from "./ModuleContext";
import type { Status, StatusAdditionalInfo, StatusGroupKey } from "./ModuleInstanceStatus";
import type { ModuleInstanceStatusController, StatusMessage } from "./ModuleInstanceStatusController";
import { Origin, StatusMessageType, StatusSource } from "./ModuleInstanceStatusController";

export type StatusWriterOptions = {
    /**
     * Identifies this writer's statuses. Defaults to a key generated per hook instance.
     * Set it to keep the same group across remounts. Writers sharing a group key replace each other's statuses.
     */
    groupKey?: StatusGroupKey;
    /**
     * Whether the statuses are reset on every render. Defaults to `true`: statuses added during a render are
     * published after it, as the current status of what was rendered.
     *
     * Set to `false` for statuses reported from callbacks. Each call is then published right away, and statuses
     * stay until `clear()` or `set()` is called, or the component unmounts.
     */
    resetOnRender?: boolean;
};

export type AddStatusOptions = {
    /** Used instead of the message to identify the status when acknowledged, see `Status.key` */
    key?: string;
    additionalInfo?: StatusAdditionalInfo;
};

/**
 * Reports the status of what a module shows. Get one with `useStatusWriter()`.
 */
export interface StatusWriter {
    addError(message: string, options?: AddStatusOptions): void;
    addWarning(message: string, options?: AddStatusOptions): void;
    flagActionRequired(message: string, options?: AddStatusOptions): void;
    /** Without `retry`, the error can only be dismissed */
    addRetryableError(message: string, retry?: () => void, options?: AddStatusOptions): void;
    /** Replaces all statuses of this writer */
    set(statuses: readonly Status[]): void;
    clear(): void;
    /** The module instance is loading while any of its writers is loading */
    setLoading(isLoading: boolean): void;
}

/**
 * Returns a status writer for the module instance whose view or settings it is used in.
 * Each call is a separate contributor, so nested components don't replace each other's statuses.
 * Its statuses are removed when the component unmounts.
 */
export function useStatusWriter(options?: StatusWriterOptions): StatusWriter {
    const statusManager = useModuleInstanceReactContext().getStatusManager();
    const generatedId = React.useId();
    const groupKey = options?.groupKey ?? [generatedId];
    const resetOnRender = options?.resetOnRender ?? true;

    const [statusWriter] = React.useState(() => new ModuleInstanceStatusWriter(statusManager, groupKey, resetOnRender));
    statusWriter.beginRender(groupKey, resetOnRender);

    React.useEffect(function publishStatuses() {
        statusWriter.publish();
    });

    React.useEffect(
        function unpublishStatusesOnUnmount() {
            return function unpublishStatuses() {
                statusWriter.unpublish();
            };
        },
        [statusWriter],
    );

    return statusWriter;
}

export class ViewStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(statusController: ModuleInstanceStatusController) {
        this._statusController = statusController;
    }

    setLoading(isLoading: boolean): void {
        this._statusController.setLoading(isLoading);
    }

    addError(error: StatusMessage | string): void {
        if (typeof error === "string") {
            error = { message: error, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.View, { type: StatusMessageType.Error, ...error });
    }

    addWarning(warning: StatusMessage | string): void {
        if (typeof warning === "string") {
            warning = { message: warning, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.View, { type: StatusMessageType.Warning, ...warning });
    }

    flagActionRequired(actionRequired: StatusMessage | string): void {
        if (typeof actionRequired === "string") {
            actionRequired = { message: actionRequired, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.View, {
            type: StatusMessageType.ActionRequired,
            ...actionRequired,
        });
    }

    setDebugMessage(message: string): void {
        this._statusController.setDebugMessage(StatusSource.View, message);
    }
}

export class SettingsStatusWriter {
    private _statusController: ModuleInstanceStatusController;

    constructor(statusController: ModuleInstanceStatusController) {
        this._statusController = statusController;
    }

    addError(error: StatusMessage | string): void {
        if (typeof error === "string") {
            error = { message: error, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.Settings, { type: StatusMessageType.Error, ...error });
    }

    addWarning(warning: StatusMessage | string): void {
        if (typeof warning === "string") {
            warning = { message: warning, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.Settings, { type: StatusMessageType.Warning, ...warning });
    }

    flagActionRequired(actionRequired: StatusMessage | string): void {
        if (typeof actionRequired === "string") {
            actionRequired = { message: actionRequired, origin: Origin.MODULE };
        }
        this._statusController.addMessage(StatusSource.Settings, {
            type: StatusMessageType.ActionRequired,
            ...actionRequired,
        });
    }

    setDebugMessage(message: string): void {
        this._statusController.setDebugMessage(StatusSource.Settings, message);
    }
}

export function useViewStatusWriter(viewContext: ViewContext<any>): ViewStatusWriter {
    const statusController = viewContext.getStatusController();

    const statusWriterRef = React.useRef<ViewStatusWriter>(new ViewStatusWriter(statusController));

    statusController.clearHotMessageCache(StatusSource.View);
    statusController.incrementReportedComponentRenderCount(StatusSource.View);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriterRef.current;
}

export function useSettingsStatusWriter(settingsContext: SettingsContext<any>): SettingsStatusWriter {
    const statusController = settingsContext.getStatusController();

    const statusWriterRef = React.useRef<SettingsStatusWriter>(new SettingsStatusWriter(statusController));

    statusController.clearHotMessageCache(StatusSource.Settings);
    statusController.incrementReportedComponentRenderCount(StatusSource.Settings);

    React.useEffect(function handleRender() {
        statusController.reviseAndPublishState();
    });

    return statusWriterRef.current;
}
