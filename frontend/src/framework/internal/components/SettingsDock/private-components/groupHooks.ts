import React from "react";

import type { DockviewGroupPanel, DockviewPanelApi } from "dockview-react";

import { useSettingsDockContext, useSettingsDockSnapshot } from "../settingsDockContext";
import type { SettingsPanelPlacement } from "../SettingsDockController";

/** The group a panel currently lives in; a tab's panel can be moved to another group while its tab stays mounted */
export function usePanelGroup(panelApi: DockviewPanelApi): DockviewGroupPanel {
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(
        function subscribeToGroupChange() {
            const disposable = panelApi.onDidGroupChange(forceUpdate);
            return () => disposable.dispose();
        },
        [panelApi],
    );

    return panelApi.group;
}

/** Where a group is (which side, or floating) and whether it is hidden, kept up to date */
export function useGroupPlacement(group: DockviewGroupPanel): SettingsPanelPlacement | null {
    const { controller } = useSettingsDockContext();
    // The side of hidden groups is tracked by the controller, so re-render on its changes as well
    useSettingsDockSnapshot();
    const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);

    React.useEffect(
        function subscribeToGroupState() {
            const disposables = [
                group.api.onDidLocationChange(forceUpdate),
                group.api.onDidActivePanelChange(forceUpdate),
                group.api.onDidDimensionsChange(forceUpdate),
                group.api.onDidVisibilityChange(forceUpdate),
            ];
            return () => disposables.forEach((disposable) => disposable.dispose());
        },
        [group],
    );

    return controller.getGroupPlacement(group);
}
