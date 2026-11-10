import type React from "react";

import { WarningRounded } from "@mui/icons-material";

import { useModuleWarning } from "@framework/internal/components/ModuleSettingsPanels/_hooks";
import type { ModuleInstance } from "@framework/ModuleInstance";
import { Banner } from "@lib/components/Banner";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

type ModuleSettingsHeaderProps = {
    activeModuleInstance: ModuleInstance<any, any> | null;
};

export function ModuleSettingsHeader(props: ModuleSettingsHeaderProps): React.ReactNode {
    const activeModuleTitle = props.activeModuleInstance?.getTitle() ?? null;

    const { warningText, isWarningVisible, dismissWarning, showWarning } = useModuleWarning(props.activeModuleInstance);

    function handleWarningIconClick() {
        if (!isWarningVisible) {
            showWarning();
        }
    }

    function makeHeaderContent() {
        const highlightWarning = !!warningText && !isWarningVisible;

        return (
            <>
                <span
                    title={activeModuleTitle ?? undefined}
                    className={resolveClassNames(
                        "text-body-sm grow self-center overflow-hidden p-0 text-ellipsis whitespace-nowrap",
                        { "text-neutral-subtle italic": !activeModuleTitle, "font-bolder": !!activeModuleTitle },
                    )}
                >
                    {activeModuleTitle ?? "No module selected"}
                </span>
                {warningText && (
                    <Tooltip content={`Module has warning${highlightWarning ? " (click to view)" : ""}`} delay="medium">
                        {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                        <span>
                            <Button
                                variant="ghost"
                                disabled={!highlightWarning}
                                tone="neutral"
                                iconOnly
                                onClick={handleWarningIconClick}
                            >
                                <WarningRounded fontSize="inherit" />
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="gap-x-md px-xs border-neutral-subtle flex h-10 items-center border-b">
                {makeHeaderContent()}
            </div>
            {isWarningVisible && warningText && (
                <WarningBanner text={warningText} onDismiss={dismissWarning} />
            )}
        </div>
    );
}

type WarningBannerProps = {
    text: string;
    onDismiss: () => void;
};

function WarningBanner(props: WarningBannerProps): React.ReactNode {
    return (
        <div className="px-2xs py-2xs">
            <Banner tone="warning" dismissable={true} onDismiss={props.onDismiss}>
                <strong>Note:</strong> {props.text}
            </Banner>
        </div>
    );
}
