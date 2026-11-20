import type React from "react";

import { ArrowBack, Close, Settings } from "@mui/icons-material";

import { GuiState, useSetGuiState } from "@framework/GuiMessageBroker";
import { useDashboard } from "@framework/internal/components/DashboardContext";
import type { StatusEntry } from "@framework/internal/ModuleInstanceStatusManager";
import { ModuleInstanceStatusManagerTopic } from "@framework/internal/ModuleInstanceStatusManager";
import { makeDisplayedStatusEntries } from "@framework/internal/statusEntryUtils";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { StatusCategory } from "@framework/ModuleInstanceStatus";
import type { Workbench } from "@framework/Workbench";
import { Button } from "@lib/components/Button";
import { Typography } from "@lib/components/Typography";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { StatusCategoryIcon } from "./statusCategoryIcon";

type StatusBannersProps = {
    workbench: Workbench;
    moduleInstance: ModuleInstance<any, any>;
};

/**
 * Shows the module instance's statuses as banners over the top of its view, most severe first.
 */
export function StatusBanners(props: StatusBannersProps): React.ReactNode {
    const { dashboard } = useDashboard();
    const setLeftSettingsPanelIsCollapsed = useSetGuiState(
        props.workbench.getGuiMessageBroker(),
        GuiState.LeftSettingsPanelIsCollapsed,
    );

    const statusManager = props.moduleInstance.getStatusManager();
    const statusEntries = usePublishSubscribeTopicValue(statusManager, ModuleInstanceStatusManagerTopic.STATUSES);
    const isLoading = usePublishSubscribeTopicValue(statusManager, ModuleInstanceStatusManagerTopic.LOADING);

    const bannerEntries = makeDisplayedStatusEntries(statusEntries, isLoading).filter(function isBannerShown(entry) {
        return !entry.acknowledged;
    });

    if (bannerEntries.length === 0) {
        return null;
    }

    function handleGoToSettings() {
        dashboard.setActiveModuleInstanceId(props.moduleInstance.getId());
        setLeftSettingsPanelIsCollapsed(false);
    }

    function handleRetry(id: string) {
        statusManager.retry(id);
    }

    function handleAcknowledge(id: string) {
        statusManager.acknowledge(id);
    }

    return (
        <div className="z-overlay absolute flex max-h-[40%] w-full flex-col overflow-y-auto select-none">
            {bannerEntries.map((entry) => (
                <StatusBanner
                    key={entry.id}
                    entry={entry}
                    onGoToSettings={handleGoToSettings}
                    onRetry={handleRetry}
                    onAcknowledge={handleAcknowledge}
                />
            ))}
        </div>
    );
}

type StatusBannerProps = {
    entry: StatusEntry;
    onGoToSettings: () => void;
    onRetry: (id: string) => void;
    onAcknowledge: (id: string) => void;
};

function StatusBanner(props: StatusBannerProps): React.ReactNode {
    const isWarning = props.entry.category === StatusCategory.WARNING;

    function handleRetryClick() {
        props.onRetry(props.entry.id);
    }

    function handleAcknowledgeClick() {
        props.onAcknowledge(props.entry.id);
    }

    return (
        <div
            className={resolveClassNames(
                "px-xs gap-x-xs py-4xs text-body-lg shadow-elevation-raised flex shrink-0 items-center justify-between border-b backdrop-blur-xs",
                {
                    "bg-warning/60 border-b-warning-subtle": isWarning,
                    "bg-danger/60 border-b-danger-subtle": !isWarning,
                },
            )}
        >
            <div className="gap-x-2xs flex min-w-0 items-center">
                <span className="flex shrink-0 items-center">
                    <StatusCategoryIcon category={props.entry.category} />
                </span>
                <Typography as="span" size="xs" title={props.entry.message} layoutClassName="min-w-0 truncate">
                    {props.entry.message}
                </Typography>
            </div>
            <div className="gap-x-2xs flex shrink-0 items-center">
                {props.entry.category === StatusCategory.ACTION_REQUIRED && (
                    <Button
                        size="small"
                        variant="ghost"
                        tone="danger"
                        aria-label="Go to settings"
                        title="Go to settings"
                        onClick={props.onGoToSettings}
                    >
                        <ArrowBack fontSize="inherit" />
                        <Settings fontSize="inherit" />
                    </Button>
                )}
                {props.entry.category === StatusCategory.RETRYABLE_ERROR && (
                    <>
                        {props.entry.canRetry && (
                            <Button size="small" variant="outlined" tone="danger" onClick={handleRetryClick}>
                                Retry
                            </Button>
                        )}
                        <Button size="small" variant="ghost" tone="danger" onClick={handleAcknowledgeClick}>
                            Dismiss
                        </Button>
                    </>
                )}
                {isWarning && (
                    <Button
                        size="small"
                        variant="ghost"
                        tone="warning"
                        iconOnly
                        aria-label="Acknowledge"
                        title="Acknowledge"
                        onClick={handleAcknowledgeClick}
                    >
                        <Close fontSize="inherit" />
                    </Button>
                )}
            </div>
        </div>
    );
}
