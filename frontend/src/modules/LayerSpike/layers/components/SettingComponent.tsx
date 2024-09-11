import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { Setting, SettingTopic } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function SettingComponent<TValue>(props: SettingComponentProps<TValue>): React.ReactNode {
    const value = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.VALUE_CHANGED);
    const availableValues = usePublishSubscribeTopicValue(
        props.setting.getDelegate(),
        SettingTopic.AVAILABLE_VALUES_CHANGED
    );
    const overriddenValue = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.OVERRIDDEN_CHANGED);
    const isLoading = usePublishSubscribeTopicValue(props.setting.getDelegate(), SettingTopic.LOADING_STATE_CHANGED);

    function handleValueChanged(newValue: TValue) {
        props.setting.getDelegate().setValue(newValue);
    }

    const Component = props.setting.makeComponent();
    return (
        <div
            key={props.setting.getDelegate().getId()}
            className={resolveClassNames("table-row", { hidden: overriddenValue !== undefined })}
        >
            <div className="table-cell align-middle p-1 text-xs whitespace-nowrap">{props.setting.getLabel()}</div>
            <div className="table-cell align-middle p-1 text-sm w-full">
                <PendingWrapper isPending={isLoading}>
                    <Component
                        onValueChange={handleValueChanged}
                        value={value}
                        isOverridden={overriddenValue !== undefined}
                        overriddenValue={overriddenValue}
                        availableValues={availableValues}
                        workbenchSession={props.workbenchSession}
                        workbenchSettings={props.workbenchSettings}
                    />
                </PendingWrapper>
            </div>
        </div>
    );
}
