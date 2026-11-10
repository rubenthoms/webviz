import type React from "react";

import { Button } from "@lib/components/Button";
import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { useSettingsDockContext, useSettingsDockSnapshot } from "../settingsDockContext";
import type { DockEdge } from "../SettingsDockController";

import { EXPAND_ICONS } from "./edgeIcons";

const TOOLTIP_SIDE: Record<DockEdge, "left" | "right" | "top" | "bottom"> = {
    left: "right",
    right: "left",
    top: "bottom",
    bottom: "top",
};

const RAIL_CLASS_NAMES: Record<DockEdge, string> = {
    left: "flex-col border-r",
    right: "flex-col border-l",
    top: "flex-row border-b",
    bottom: "flex-row border-t",
};

// Between the small (24px) and default (36px) button sizes
const RAIL_BUTTON_CLASS_NAME = "[width:30px] [height:30px]";

export type SettingsRailProps = {
    edge: DockEdge;
};

/**
 * Icons of all panels that belong on this side (where they are docked, or were last docked). Panels in a shown group
 * are toggled on, also when they are not the active tab; clicking toggles a panel. On a collapsed side, panels open
 * as a flyout, and the rail offers to expand the side again. Renders nothing when no panel belongs on the side.
 */
export function SettingsRail(props: SettingsRailProps): React.ReactNode {
    const { controller, panels } = useSettingsDockContext();
    const { panelIdsByEdge, shownPanelIds, collapsedEdges } = useSettingsDockSnapshot();
    const isCollapsed = collapsedEdges.includes(props.edge);

    const railPanels = panelIdsByEdge[props.edge].flatMap((panelId) => panels.get(panelId) ?? []);
    if (railPanels.length === 0) {
        return null;
    }

    return (
        <div
            data-settings-rail={props.edge}
            data-testid={`settings-rail-${props.edge}`}
            className={resolveClassNames(
                "bg-surface border-neutral-subtle gap-3xs p-4xs flex shrink-0 items-center",
                RAIL_CLASS_NAMES[props.edge],
            )}
        >
            {isCollapsed && (
                <Tooltip content={`Expand ${props.edge} panels`} side={TOOLTIP_SIDE[props.edge]}>
                    <span className="flex">
                        <Button
                            variant="ghost"
                            tone="neutral"
                            size="small"
                            iconOnly
                            layoutClassName={RAIL_BUTTON_CLASS_NAME}
                            aria-label={`Expand ${props.edge} panels`}
                            data-testid={`settings-rail-expand-${props.edge}`}
                            onClick={() => controller.expandEdge(props.edge)}
                        >
                            <span className="text-body-lg flex">{EXPAND_ICONS[props.edge]}</span>
                        </Button>
                    </span>
                </Tooltip>
            )}
            {railPanels.map((panel) => {
                const isShown = shownPanelIds.includes(panel.id);
                let tooltip = `${isShown ? "Hide" : "Show"} ${panel.title.toLowerCase()}`;
                if (panel.disabled) {
                    tooltip = panel.disabledTooltip ?? panel.title;
                }

                return (
                    <Tooltip key={panel.id} content={tooltip} side={TOOLTIP_SIDE[props.edge]}>
                        {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
                        <span className="flex">
                            <Button
                                variant="ghost"
                                tone="neutral"
                                size="small"
                                iconOnly
                                layoutClassName={RAIL_BUTTON_CLASS_NAME}
                                pressed={isShown}
                                disabled={panel.disabled}
                                aria-label={panel.title}
                                aria-pressed={isShown}
                                data-testid={panel.railTestId ?? `settings-rail-${panel.id}`}
                                onClick={() => controller.togglePanel(panel.id)}
                            >
                                <span className="text-body-lg flex">{panel.icon}</span>
                            </Button>
                        </span>
                    </Tooltip>
                );
            })}
        </div>
    );
}
