import { PublicOutlined } from "@mui/icons-material";

import { useElevatedSettingInstances } from "@framework/ElevatedSettings/adapters/react";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";

export type ElevatedSettingsToggleProps = {
    workbench: Workbench;
};

export function ElevatedSettingsToggle(props: ElevatedSettingsToggleProps): React.ReactNode {
    const guiMessageBroker = props.workbench.getGuiMessageBroker();
    const [isPanelVisible, setIsPanelVisible] = useGuiState(guiMessageBroker, GuiState.ElevatedSettingsPanelVisible);
    const [isLeftSettingsPanelCollapsed, setIsLeftSettingsPanelCollapsed] = useGuiState(
        guiMessageBroker,
        GuiState.LeftSettingsPanelIsCollapsed,
    );

    const dashboard = useActiveDashboard();
    const activeElevatedSettings = useElevatedSettingInstances(dashboard.getElevatedSettingsService());

    // The panel lives in the left settings panel, so it's only actually shown while that is expanded.
    const isPanelShown = isPanelVisible && !isLeftSettingsPanelCollapsed;

    function handleClick() {
        if (isPanelShown) {
            setIsPanelVisible(false);
            return;
        }

        setIsPanelVisible(true);
        setIsLeftSettingsPanelCollapsed(false);
    }

    const label = isPanelShown ? "Hide dashboard settings" : "Show dashboard settings";

    return (
        <Tooltip content={label} side="bottom">
            <Button
                aria-label={label}
                aria-pressed={isPanelShown}
                iconOnly
                onClick={handleClick}
                tone="accent"
                variant={isPanelShown ? "outlined" : "ghost"}
            >
                <Badge
                    invisible={activeElevatedSettings.length === 0}
                    tone="accent"
                    badgeContent={activeElevatedSettings.length}
                >
                    <PublicOutlined />
                </Badge>
            </Button>
        </Tooltip>
    );
}
