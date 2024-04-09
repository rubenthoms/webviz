import { ModuleViewProps } from "@framework/Module";

import { SettingsToViewInterface } from "./settingsToViewInterface";
import { State } from "./state";

export function View(props: ModuleViewProps<State, SettingsToViewInterface>): JSX.Element {
    const selectedEnsembleIdent = props.viewContext.useSettingsToViewInterfaceValue("selectedEnsembleIdent");
    return <div>{selectedEnsembleIdent?.toString()}</div>;
}
