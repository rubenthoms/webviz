import type React from "react";

import { OpenInNew, PushPin } from "@mui/icons-material";
import type { IDockviewHeaderActionsProps } from "dockview-react";

import { Button } from "@lib/components/Button";

import { useSettingsDockContext } from "../settingsDockContext";

import { COLLAPSE_ICONS } from "./edgeIcons";
import { useGroupPlacement } from "./groupHooks";


type ActionButtonProps = {
    title: string;
    icon: React.ReactElement;
    testId: string;
    onClick: () => void;
};

function ActionButton(props: ActionButtonProps): React.ReactNode {
    return (
        <Button
            variant="ghost"
            tone="neutral"
            size="small"
            iconOnly
            title={props.title}
            aria-label={props.title}
            data-testid={props.testId}
            onClick={props.onClick}
        >
            {props.icon}
        </Button>
    );
}

/** Float and collapse-side for docked groups, and dock for floating groups */
export function GroupHeaderActions(props: IDockviewHeaderActionsProps): React.ReactNode {
    const { controller } = useSettingsDockContext();
    const placement = useGroupPlacement(props.group);

    if (!placement || props.panels.length === 0) {
        return null;
    }

    if (placement.type === "floating") {
        return (
            <div className="settings-dock-actions flex items-center">
                <ActionButton
                    title="Dock panels"
                    icon={<PushPin fontSize="inherit" />}
                    testId="settings-dock-dock-group"
                    onClick={() => controller.dockGroup(props.group)}
                />
            </div>
        );
    }

    const { edge } = placement;
    const activePanelId = props.activePanel?.id;
    return (
        <div className="settings-dock-actions flex items-center">
            {activePanelId && (
                <ActionButton
                    title="Float panel"
                    icon={<OpenInNew fontSize="inherit" />}
                    testId={`settings-dock-float-${edge ?? "unknown"}`}
                    onClick={() => controller.floatPanel(activePanelId)}
                />
            )}
            {edge && (
                <ActionButton
                    title={`Collapse ${edge} panels`}
                    icon={COLLAPSE_ICONS[edge]}
                    testId={`settings-dock-collapse-${edge}`}
                    onClick={() => controller.collapseEdge(edge)}
                />
            )}
        </div>
    );
}
