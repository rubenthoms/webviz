import type React from "react";

import { Close } from "@mui/icons-material";

import { Button } from "@lib/components/Button";

import { PanelSlot, useSettingsDockContext, useSettingsDockSnapshot } from "../settingsDockContext";
import type { DockEdge } from "../SettingsDockController";

import { EXPAND_ICONS } from "./edgeIcons";

/** Never more than this share of the dock, so some of the modules stay visible */
const MAX_DOCK_SHARE = 0.6;

function makeFlyoutStyle(edge: DockEdge, size: number): React.CSSProperties {
    const extent = `min(${size}px, ${MAX_DOCK_SHARE * 100}%)`;
    switch (edge) {
        case "left":
            return { left: 0, top: 0, bottom: 0, width: extent };
        case "right":
            return { right: 0, top: 0, bottom: 0, width: extent };
        case "top":
            return { top: 0, left: 0, right: 0, height: extent };
        case "bottom":
            return { bottom: 0, left: 0, right: 0, height: extent };
    }
}

/**
 * A panel of a collapsed side, floating over the modules along that side without changing the layout. Expanding docks
 * the side again; clicking outside hides the flyout.
 */
export function SettingsFlyout(): React.ReactNode {
    const { controller, panels } = useSettingsDockContext();
    const { flyout } = useSettingsDockSnapshot();

    if (!flyout) {
        return null;
    }
    const panel = panels.get(flyout.panelId);
    const { edge } = flyout;

    return (
        <div
            data-settings-flyout
            data-testid="settings-flyout"
            className="settings-dock-flyout border-neutral-subtle bg-surface absolute flex flex-col border"
            style={makeFlyoutStyle(edge, controller.getCollapsedEdgeSize(edge))}
        >
            <div className="bg-canvas border-neutral-subtle gap-x-2xs px-xs flex h-10 shrink-0 items-center border-b">
                <span className="text-body-lg flex items-center">{panel?.icon}</span>
                <span className="text-body-sm grow truncate">{panel?.title}</span>
                <Button
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    iconOnly
                    title={`Expand ${edge} panels`}
                    aria-label={`Expand ${edge} panels`}
                    data-testid="settings-flyout-expand"
                    onClick={() => controller.expandEdge(edge)}
                >
                    {EXPAND_ICONS[edge]}
                </Button>
                <Button
                    variant="ghost"
                    tone="neutral"
                    size="small"
                    iconOnly
                    title="Hide"
                    aria-label="Hide"
                    data-testid="settings-flyout-hide"
                    onClick={() => controller.closeFlyout()}
                >
                    <Close fontSize="inherit" />
                </Button>
            </div>
            <div className="min-h-0 grow">
                <PanelSlot panelId={flyout.panelId} />
            </div>
        </div>
    );
}
