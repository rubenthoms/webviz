import { HubOutlined } from "@mui/icons-material";

import { useElevatedSettingInstances } from "@framework/ElevatedSettings/adapters/react";
import { GuiState, useGuiState } from "@framework/GuiMessageBroker";
import type { Workbench } from "@framework/Workbench";
import { Badge } from "@lib/components/Badge";
import { Tooltip } from "@lib/components/Tooltip";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { Toggle } from "@lib/components/Toggle";

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
            <Toggle.Button
                aria-label={label}
                aria-pressed={isPanelShown}
                onPressedChange={handleClick}
                pressed={isPanelShown}
            >
                <Badge
                    invisible={activeElevatedSettings.length === 0}
                    tone="accent"
                    badgeContent={activeElevatedSettings.length}
                >
                    <HubOutlined />
                </Badge>
            </Toggle.Button>
        </Tooltip>
    );
}
