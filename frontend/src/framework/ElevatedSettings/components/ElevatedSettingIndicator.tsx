import { HubOutlined } from "@mui/icons-material";

import { Tooltip } from "@lib/components/Tooltip";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

export type ElevatedSettingIndicatorProps = {
    elevatedSettingLabel: string;
    // Whether the elevated value is available in the context of the setting it controls. @default true
    isValueValidHere?: boolean;
};

/**
 * Shown after the label of a module's own setting (DPF or regular) while it is controlled by an elevated
 * (dashboard) setting, so a controlled value is marked the same way everywhere.
 */
export function ElevatedSettingIndicator(props: ElevatedSettingIndicatorProps): React.ReactNode {
    const isValueValidHere = props.isValueValidHere ?? true;

    const tooltip = isValueValidHere
        ? `Controlled by the dashboard setting "${props.elevatedSettingLabel}"`
        : `Controlled by the dashboard setting "${props.elevatedSettingLabel}", whose value is not available here`;

    return (
        <Tooltip content={tooltip} side="right">
            {/* Using a span to ensure the tooltip has a child with enabled pointer-events */}
            <span
                aria-label={tooltip}
                className={resolveClassNames("inline-flex items-center", {
                    "text-accent-subtle": isValueValidHere,
                    "text-danger-subtle": !isValueValidHere,
                })}
            >
                <HubOutlined fontSize="inherit" />
            </span>
        </Tooltip>
    );
}
