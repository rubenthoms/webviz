import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";

import { usePublishSubscribeTopicValue } from "../PublishSubscribeHandler";
import { Setting, SettingTopic } from "../interfaces";

export type SettingComponentProps<TValue> = {
    setting: Setting<TValue>;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function SettingComponent<TValue>(props: SettingComponentProps<TValue>): React.ReactNode {
    const value = usePublishSubscribeTopicValue(props.setting, SettingTopic.VALUE_CHANGED);

    function handleValueChanged(newValue: TValue) {
        props.setting.setValue(newValue);
    }

    const Component = props.setting.makeComponent();
    return (
        <div key={props.setting.toString()} className="table-row">
            <div className="table-cell align-middle p-1 text-sm">{props.setting.getLabel()}:</div>
            <div className="table-cell align-middle p-1 text-sm w-full">
                <Component
                    onValueChange={handleValueChanged}
                    value={value}
                    availableValues={props.setting.getAvailableValues()}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                />
            </div>
        </div>
    );
}
