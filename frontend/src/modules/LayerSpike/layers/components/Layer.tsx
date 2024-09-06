import { WorkbenchSession } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { SortableListItem } from "@lib/components/SortableList";

import { SettingComponent } from "./Setting";

import { LayerBase } from "../LayerBase";
import { Setting } from "../interfaces";

export type LayerComponentProps = {
    layer: LayerBase;
    onRemove: (id: string) => void;
    workbenchSettings: WorkbenchSettings;
    workbenchSession: WorkbenchSession;
};

export function Layer(props: LayerComponentProps): React.ReactNode {
    function makeSetting(setting: Setting<any>) {
        return (
            <SettingComponent
                key={setting.toString()}
                setting={setting}
                workbenchSettings={props.workbenchSettings}
                workbenchSession={props.workbenchSession}
            />
        );
    }
    return (
        <SortableListItem key={props.layer.getId()} id={props.layer.getId()} title={props.layer.getName()}>
            <div className="table">
                {props.layer
                    .getSettingsContext()
                    .getSettings()
                    .map((setting) => makeSetting(setting))}
            </div>
        </SortableListItem>
    );
}
