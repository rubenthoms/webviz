import React from "react";

import { useActionBarContribution } from "@framework/ActionBar";
import type { ModuleViewProps } from "@framework/Module";
import type { SelectionItem } from "@framework/Selection";
import { isSameSelectionItem, useSelection, useSelectionEditor } from "@framework/Selection";
import { resolveClassNames } from "@lib/utils/resolveClassNames";

import { getActivationKey, isOwnSelection, MOCK_ITEMS, POLYLINE_TAB } from "./shared";

export function View(props: ModuleViewProps): React.ReactNode {
    const selection = useSelection();
    const editor = useSelectionEditor();
    const moduleInstanceId = props.viewContext.getInstanceIdString();
    const isOwn = isOwnSelection(selection, moduleInstanceId);

    const [renderCounter, setRenderCounter] = React.useState(0);
    const [highlight, setHighlight] = React.useState(true);
    const [width, setWidth] = React.useState(2);

    function handleItemClick(event: React.MouseEvent, item: SelectionItem) {
        if (event.ctrlKey || event.metaKey) {
            editor.toggle(item);
            return;
        }
        editor.replace([item]);
    }

    // Deliberately not memoized: a new descriptor on every render must not steal focus
    useActionBarContribution({
        tab: { id: "debug", label: "Debug", order: 0 },
        groups: [
            {
                id: "view",
                label: "View",
                controls: [
                    {
                        type: "button",
                        id: "rerender",
                        action: {
                            id: "rerender",
                            label: `Rerender (${renderCounter})`,
                            execute: () => setRenderCounter((prev) => prev + 1),
                        },
                    },
                    {
                        type: "toggle",
                        id: "highlight",
                        label: "Highlight",
                        pressed: highlight,
                        setPressed: setHighlight,
                    },
                ],
            },
        ],
    });

    useActionBarContribution(
        selection.items.length > 0
            ? {
                  tab: POLYLINE_TAB,
                  activation: "activate",
                  activationKey: getActivationKey(selection),
                  groups: [
                      {
                          id: "selection",
                          label: "Selection",
                          order: 0,
                          controls: [
                              {
                                  type: "button",
                                  id: "remove-current",
                                  action: {
                                      id: "remove-current",
                                      label: "Remove current",
                                      isEnabled: isOwn,
                                      execute: () => selection.currentItem && editor.remove([selection.currentItem]),
                                  },
                              },
                              {
                                  type: "button",
                                  id: "clear",
                                  action: {
                                      id: "clear",
                                      label: "Clear",
                                      isEnabled: isOwn,
                                      execute: () => editor.clear(),
                                  },
                              },
                          ],
                      },
                      {
                          id: "appearance",
                          label: "Appearance",
                          order: 1,
                          controls: [
                              {
                                  type: "number",
                                  id: "width",
                                  label: "Width",
                                  value: width,
                                  min: 1,
                                  max: 10,
                                  step: 1,
                                  setValue: setWidth,
                              },
                          ],
                      },
                  ],
              }
            : null,
    );

    return (
        <div className="gap-y-xs p-xs flex h-full w-full flex-col">
            <div className="text-body-sm text-neutral-subtle">
                Click to select, Ctrl/Cmd+click to toggle. Selection is shared by all modules in this dashboard.
            </div>
            <div className="gap-x-xs flex">
                {MOCK_ITEMS.map((item) => {
                    const isSelected = selection.items.some((el) => isSameSelectionItem(el, item));
                    const isCurrent = isSameSelectionItem(selection.currentItem, item);
                    const isAnchor = isSameSelectionItem(selection.anchorItem, item);
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={resolveClassNames(
                                "flex h-16 w-16 flex-col items-center justify-center rounded border",
                                {
                                    "bg-accent-strong text-accent-strong-on-emphasis": isSelected && highlight,
                                    // Outline, not border, so it stays visible on top of the highlight fill
                                    "outline-accent-strong outline-solid": isCurrent,
                                },
                            )}
                            style={isCurrent ? { outlineWidth: width, outlineOffset: 2 } : undefined}
                            onClick={(event) => handleItemClick(event, item)}
                        >
                            <span>{item.id}</span>
                            {isAnchor && <span className="text-body-xs">anchor</span>}
                        </button>
                    );
                })}
            </div>
            <div className="text-body-sm">
                {selection.sourceModuleInstance
                    ? `Selected by ${isOwn ? "this module" : `"${selection.sourceModuleInstance.getTitle()}"`}: ${selection.items.map((el) => el.id).join(", ")}`
                    : "Nothing selected"}
            </div>
        </div>
    );
}
