import React from "react";

import type { PanelElementRegistry } from "./panelElementRegistry";
import type { DockEdge, SettingsDockController } from "./SettingsDockController";

export type SettingsDockPanel = {
    id: string;
    title: string;
    icon: React.ReactElement;
    /** Where the panel opens the first time, and the side of its rail icon until it is docked elsewhere */
    defaultEdge: DockEdge;
    /** Whether the panel is part of the initial layout; others start closed and are opened from their rail icon */
    initiallyOpen?: boolean;
    content: React.ReactNode;
    disabled?: boolean;
    disabledTooltip?: string;
    railTestId?: string;
};

export type SettingsDockContextValue = {
    controller: SettingsDockController;
    registry: PanelElementRegistry;
    panels: ReadonlyMap<string, SettingsDockPanel>;
};

export const SettingsDockContext = React.createContext<SettingsDockContextValue | null>(null);

/** Kept separate from the dock context, so changes to the dock never re-render the module layout */
export const SettingsDockCenterContext = React.createContext<React.ReactNode>(null);

export function useSettingsDockContext(): SettingsDockContextValue {
    const context = React.useContext(SettingsDockContext);
    if (!context) {
        throw new Error("useSettingsDockContext must be used inside SettingsDock");
    }
    return context;
}

/** For panel content, e.g. to close its panel or to guard closing it */
export function useSettingsDockController(): SettingsDockController {
    return useSettingsDockContext().controller;
}

export function useSettingsDockSnapshot() {
    const { controller } = useSettingsDockContext();
    return React.useSyncExternalStore(controller.subscribe, controller.getSnapshot);
}

export type PanelSlotProps = {
    panelId: string;
};

/** Where a settings panel's content is shown; see `PanelElementRegistry` */
export function PanelSlot(props: PanelSlotProps): React.ReactNode {
    const { registry } = useSettingsDockContext();
    const ref = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(
        function claimPanelElement() {
            if (!ref.current) {
                return;
            }
            return registry.claim(props.panelId, ref.current);
        },
        [registry, props.panelId],
    );

    return <div ref={ref} className="bg-surface flex h-full min-h-0 w-full flex-col overflow-hidden" />;
}
