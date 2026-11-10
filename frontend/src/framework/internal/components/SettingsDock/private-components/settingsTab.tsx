import type React from "react";

import { Close } from "@mui/icons-material";
import type { IDockviewPanelHeaderProps } from "dockview-react";

import { useSettingsDockContext } from "../settingsDockContext";

/** Tab of a settings panel; closing goes through the dock, so close guards (e.g. unsaved changes) apply */
export function SettingsTab(props: IDockviewPanelHeaderProps): React.ReactNode {
    const { controller, panels } = useSettingsDockContext();

    const panelId = props.api.id;
    const panel = panels.get(panelId);
    const title = panel?.title ?? props.api.title ?? panelId;

    function handleCloseClickCapture(event: React.MouseEvent) {
        // Keeps dockview from also handling the click as a tab click
        event.preventDefault();
        event.stopPropagation();
        controller.closePanel(panelId);
    }

    return (
        <div
            data-testid={`settings-tab-${panelId}`}
            className="settings-dock-tab gap-3xs flex h-full items-center select-none"
        >
            <span className="text-body-lg flex shrink-0 items-center">{panel?.icon}</span>
            <span className="truncate">{title}</span>
            <button
                type="button"
                aria-label={`Close ${title}`}
                title={`Close ${title}`}
                className="settings-dock-tab__close text-body-md flex shrink-0 items-center rounded-sm"
                onClickCapture={handleCloseClickCapture}
            >
                <Close fontSize="inherit" />
            </button>
        </div>
    );
}
