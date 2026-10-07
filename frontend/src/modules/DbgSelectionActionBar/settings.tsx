import type React from "react";

import { useActionBarContribution } from "@framework/ActionBar";
import type { ModuleSettingsProps } from "@framework/Module";
import { useSelection } from "@framework/Selection";

import { getActivationKey, POLYLINE_TAB } from "./shared";

export function Settings(props: ModuleSettingsProps): React.ReactNode {
    const selection = useSelection();
    const moduleInstanceId = props.settingsContext.getInstanceIdString();

    // Contributes to the same contextual tab as the view, from the separate settings tree
    useActionBarContribution(
        selection.items.length > 0
            ? {
                  tab: POLYLINE_TAB,
                  activation: "activate",
                  activationKey: getActivationKey(selection),
                  groups: [
                      {
                          id: "settings",
                          label: "From settings",
                          order: 2,
                          controls: [
                              {
                                  type: "button",
                                  id: "log-selection",
                                  action: {
                                      id: "log-selection",
                                      label: "Log selection",
                                      execute: () => console.info(`[${moduleInstanceId}] selection`, selection),
                                  },
                              },
                          ],
                      },
                  ],
              }
            : null,
    );

    return (
        <div className="p-xs text-body-sm flex flex-col">
            <div>Selected items: {selection.items.map((el) => el.id).join(", ") || "none"}</div>
            <div>Anchor: {selection.anchorItem?.id ?? "-"}</div>
            <div>Current: {selection.currentItem?.id ?? "-"}</div>
        </div>
    );
}
