import type React from "react";

import { Add, Close, PublicOutlined } from "@mui/icons-material";

import {
    useElevatedSettingInstances,
    useElevatedSettingInstanceTopic,
} from "@framework/ElevatedSettings/adapters/react";
import {
    ElevatedSettingInstanceTopic,
    ElevatedSettingValueSource,
    type ElevatedSettingInstance,
} from "@framework/ElevatedSettings/ElevatedSettingInstance";
import { ElevatedSettingRegistry } from "@framework/ElevatedSettings/ElevatedSettingRegistry";
import type { ElevatedSettingsService } from "@framework/ElevatedSettings/ElevatedSettingsService";
import { PrivateWorkbenchSessionTopic } from "@framework/internal/WorkbenchSession/PrivateWorkbenchSession";
import { Button } from "@lib/components/Button";
import { Menu } from "@lib/components/Menu";
import { Setting, type SettingAnnotation } from "@lib/components/Setting";
import { Tooltip } from "@lib/components/Tooltip";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import { useActiveDashboard } from "../../ActiveDashboardBoundary";
import { useActiveSession } from "../../ActiveSessionBoundary";

import { EmptySettingsPlaceholder } from "./emptySettingsPlaceholder";

export function ElevatedSettingsPanel(): React.ReactNode {
    const dashboard = useActiveDashboard();
    const workbenchSession = useActiveSession();
    const isSnapshot = usePublishSubscribeTopicValue(workbenchSession, PrivateWorkbenchSessionTopic.IS_SNAPSHOT);

    const elevatedSettingsService = dashboard.getElevatedSettingsService();
    const activeInstances = useElevatedSettingInstances(elevatedSettingsService);

    return (
        <div className="border-b-neutral-subtle flex max-h-[40%] min-h-0 shrink-0 flex-col border-b-2">
            <div className="gap-x-xs pr-2xs pl-xs bg-canvas flex h-10 shrink-0 items-center">
                <PublicOutlined fontSize="small" />
                <span className="text-body-sm font-bolder grow">Dashboard settings</span>
                <AddElevatedSettingMenu
                    elevatedSettingsService={elevatedSettingsService}
                    activeInstances={activeInstances}
                    disabled={isSnapshot}
                />
            </div>
            <div className="min-h-0 overflow-y-auto">
                {activeInstances.length === 0 ? (
                    <div className="py-sm">
                        <EmptySettingsPlaceholder text="No dashboard settings yet - add one with +" />
                    </div>
                ) : (
                    <Setting.Panel>
                        {activeInstances.map((instance) => (
                            <ElevatedSettingField
                                key={instance.getDefinition().key}
                                instance={instance}
                                onRemove={() => elevatedSettingsService.removeSetting(instance.getDefinition())}
                                removeDisabled={isSnapshot}
                            />
                        ))}
                    </Setting.Panel>
                )}
            </div>
        </div>
    );
}

type AddElevatedSettingMenuProps = {
    elevatedSettingsService: ElevatedSettingsService;
    activeInstances: readonly ElevatedSettingInstance<any, any>[];
    disabled: boolean;
};

function AddElevatedSettingMenu(props: AddElevatedSettingMenuProps): React.ReactNode {
    const activeKeys = new Set(props.activeInstances.map((instance) => instance.getDefinition().key));
    const availableDefinitions = ElevatedSettingRegistry.getRegisteredSettings().filter(
        (definition) => !activeKeys.has(definition.key),
    );

    const isDisabled = props.disabled || availableDefinitions.length === 0;

    let title = "Add a dashboard setting";
    if (props.disabled) {
        title = "Dashboard settings cannot be changed in snapshot mode";
    } else if (availableDefinitions.length === 0) {
        title = "All available dashboard settings are already added";
    }

    return (
        <Menu.Root>
            <Menu.Trigger disabled={isDisabled}>
                <Button
                    aria-label="Add a dashboard setting"
                    focusableWhenDisabled
                    iconOnly
                    size="small"
                    title={title}
                    tone="neutral"
                    variant="ghost"
                >
                    <Add fontSize="inherit" />
                </Button>
            </Menu.Trigger>
            <Menu.Popup>
                {availableDefinitions.map((definition) => (
                    <Menu.Item
                        key={definition.key}
                        text={definition.label}
                        onClick={() => props.elevatedSettingsService.addSetting(definition)}
                    />
                ))}
            </Menu.Popup>
        </Menu.Root>
    );
}

type ElevatedSettingFieldProps = {
    instance: ElevatedSettingInstance<any, any>;
    onRemove: () => void;
    removeDisabled: boolean;
};

function ElevatedSettingField(props: ElevatedSettingFieldProps): React.ReactNode {
    const definition = props.instance.getDefinition();

    const value = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.VALUE);
    const valueSource = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.VALUE_SOURCE);
    const isValueValid = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.IS_VALUE_VALID);
    const constraints = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.CONSTRAINTS);
    const isSettling = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.IS_SETTLING);
    const sourceCount = useElevatedSettingInstanceTopic(props.instance, ElevatedSettingInstanceTopic.SOURCE_COUNT);

    const annotations: SettingAnnotation[] = [];
    if (sourceCount === 0) {
        annotations.push({ type: "info", message: "Not used by any module on this dashboard." });
    } else if (!isValueValid && !isSettling) {
        annotations.push({
            type: "error",
            message:
                valueSource === ElevatedSettingValueSource.RESTORED
                    ? "The restored value is invalid. Please choose a valid value."
                    : "The current value is invalid. Please choose a valid value.",
        });
    }

    return (
        <Setting.Field
            label={definition.label}
            description={sourceCount ? `Options from ${sourceCount} source${sourceCount === 1 ? "" : "s"}` : undefined}
            annotations={annotations}
        >
            <div className="gap-x-2xs flex items-center">
                <div className="min-w-0 grow">
                    <definition.Component
                        value={value}
                        constraints={constraints}
                        isValueValid={isValueValid ?? true}
                        isSettling={isSettling ?? false}
                        onValueChange={(newValue: unknown) => props.instance.setValue(newValue)}
                    />
                </div>
                <Tooltip content={`Remove "${definition.label}" from the dashboard settings`} side="bottom">
                    <Button
                        aria-label={`Remove ${definition.label}`}
                        disabled={props.removeDisabled}
                        focusableWhenDisabled
                        iconOnly
                        onClick={props.onRemove}
                        size="small"
                        tone="neutral"
                        variant="ghost"
                    >
                        <Close fontSize="inherit" />
                    </Button>
                </Tooltip>
            </div>
        </Setting.Field>
    );
}
