import React from "react";

import type {
    DockviewApi,
    DockviewReadyEvent,
    DockviewTheme,
    DroptargetOverlayModel,
    GetTabContextMenuItemsParams,
    IDockviewPanelProps,
} from "dockview-react";
import { DockviewReact } from "dockview-react";
import { createPortal } from "react-dom";

import { PanelElementRegistry } from "./panelElementRegistry";
import { GroupHeaderActions } from "./private-components/groupHeaderActions";
import { SettingsFlyout } from "./private-components/settingsFlyout";
import { SettingsRail } from "./private-components/settingsRail";
import { SettingsTab } from "./private-components/settingsTab";
import {
    PanelSlot,
    SettingsDockCenterContext,
    SettingsDockContext,
    type SettingsDockContextValue,
    type SettingsDockPanel,
} from "./settingsDockContext";
import {
    DOCK_EDGES,
    MODULES_PANEL_COMPONENT,
    MODULES_PANEL_ID,
    SETTINGS_PANEL_COMPONENT,
    type SettingsDockController,
} from "./SettingsDockController";
import { loadSettingsDockLayout, saveSettingsDockLayout, type StoredSettingsDockLayout } from "./settingsDockLayoutStorage";

const SETTINGS_DOCK_THEME: DockviewTheme = {
    name: "webviz-settings",
    className: "dockview-theme-webviz-settings",
};

const SAVE_LAYOUT_DEBOUNCE_MS = 400;

function ModulesPanelContent(): React.ReactNode {
    return React.useContext(SettingsDockCenterContext);
}

function SettingsPanelContent(props: IDockviewPanelProps): React.ReactNode {
    return <PanelSlot panelId={props.api.id} />;
}

const COMPONENTS = {
    [MODULES_PANEL_COMPONENT]: ModulesPanelContent,
    [SETTINGS_PANEL_COMPONENT]: SettingsPanelContent,
};

/** Drop zones on the module layout's edges, for docking a settings panel right next to the modules */
const MODULES_EDGE_OVERLAY_MODEL: DroptargetOverlayModel = {
    activationSize: { type: "pixels", value: 40 },
    size: { type: "pixels", value: 320 },
};

const MODULES_MIN_SIZE_PX = { width: 320, height: 200 };

/** Drop zones along the dock's outer border, for starting a new column or row of settings panels */
const LAYOUT_EDGE_OVERLAY_MODEL: DroptargetOverlayModel = {
    activationSize: { type: "pixels", value: 16 },
    size: { type: "pixels", value: 320 },
};

/** The module layout's group: no tab header, and settings panels can be docked next to it but never into it */
function configureModulesGroup(api: DockviewApi): void {
    const group = api.getPanel(MODULES_PANEL_ID)?.group;
    if (group) {
        group.header.hidden = true;
        group.api.locked = true;
        // Space freed by hiding, closing or floating settings goes to the module layout rather than to other settings.
        // Dockview has no API for a group's layout priority, so the field read by its `priority` getter is set.
        (group as unknown as { _priority?: string })._priority = "high";
        group.api.setConstraints({
            minimumWidth: MODULES_MIN_SIZE_PX.width,
            minimumHeight: MODULES_MIN_SIZE_PX.height,
        });
    }
}

function createDefaultLayout(api: DockviewApi, controller: SettingsDockController, panels: SettingsDockPanel[]): void {
    api.clear();
    api.addPanel({ id: MODULES_PANEL_ID, component: MODULES_PANEL_COMPONENT });
    configureModulesGroup(api);
    controller.setLastEdges({});
    controller.setLastPositions({});
    controller.setHiddenGroupEdges({});
    controller.setCollapsedEdges({});

    const initialPanels = panels.filter((panel) => panel.initiallyOpen);
    initialPanels.forEach((panel) => controller.showPanel(panel.id));
    // The first panel of each side is the one shown
    for (const edge of DOCK_EDGES) {
        const firstPanelId = initialPanels.find((panel) => panel.defaultEdge === edge)?.id;
        if (firstPanelId) {
            api.getPanel(firstPanelId)?.api.setActive();
        }
    }
}

/** Restores a stored layout, keeping the module layout's group to itself. Returns false if it is unusable. */
function restoreLayout(api: DockviewApi, controller: SettingsDockController, stored: StoredSettingsDockLayout): boolean {
    try {
        api.fromJSON(stored.dockview);
    } catch (error) {
        console.warn("Could not restore the stored settings layout", error);
        return false;
    }

    const modulesPanel = api.getPanel(MODULES_PANEL_ID);
    if (!modulesPanel || modulesPanel.group.api.location.type !== "grid") {
        return false;
    }
    configureModulesGroup(api);
    controller.setLastEdges(stored.lastEdges);
    controller.setLastPositions(stored.lastPositions);
    controller.setHiddenGroupEdges(stored.hiddenGroupEdges);
    controller.setCollapsedEdges(stored.collapsedEdges);

    for (const panel of [...api.panels]) {
        if (panel.id === MODULES_PANEL_ID) {
            continue;
        }
        if (!controller.isSettingsPanel(panel.id)) {
            api.removePanel(panel);
            continue;
        }
        if (panel.group === modulesPanel.group || panel.group.api.location.type === "popout") {
            controller.dockPanel(panel.id);
        }
    }
    return true;
}

export type SettingsDockProps = {
    /** The module layout, shown in the center */
    center: React.ReactNode;
    /** All settings panels, in the order of the rail */
    panels: SettingsDockPanel[];
    controller: SettingsDockController;
    /** The layout is stored under this localStorage key; omit to always start from the default layout */
    storageKey?: string;
};

/**
 * Hosts the module layout in the center and the settings panels around it. Settings panels can be docked on any side
 * of the modules, grouped as tabs or split next to/below each other, or floated over the modules. Each side has a rail
 * with an icon per panel that belongs there, to show or hide it; hidden panels return exactly where they were. Modules and settings live in separate dockview instances,
 * so they never mix.
 */
export function SettingsDock(props: SettingsDockProps): React.ReactNode {
    const { controller } = props;
    const [registry] = React.useState(() => new PanelElementRegistry());
    const [api, setApi] = React.useState<DockviewApi | null>(null);

    const propsRef = React.useRef(props);
    propsRef.current = props;

    const panelsById = React.useMemo(
        () => new Map(props.panels.map((panel) => [panel.id, panel])),
        [props.panels],
    );

    const contextValue = React.useMemo<SettingsDockContextValue>(
        () => ({ controller, registry, panels: panelsById }),
        [controller, registry, panelsById],
    );

    const panelDefaultsKey = props.panels.map((panel) => `${panel.id}:${panel.title}:${panel.defaultEdge}`).join("|");
    React.useEffect(
        function updatePanelDefaults() {
            controller.setPanelDefaults(
                propsRef.current.panels.map(({ id, title, defaultEdge }) => ({ id, title, defaultEdge })),
            );
        },
        [controller, panelDefaultsKey],
    );

    const handleReady = React.useCallback(
        function handleReady(event: DockviewReadyEvent) {
            const { panels, storageKey } = propsRef.current;
            controller.setPanelDefaults(panels.map(({ id, title, defaultEdge }) => ({ id, title, defaultEdge })));
            controller.attach(event.api);

            controller.setRestoring(true);
            const stored = storageKey ? loadSettingsDockLayout(storageKey) : null;
            if (!stored || !restoreLayout(event.api, controller, stored)) {
                createDefaultLayout(event.api, controller, panels);
            }
            controller.setRestoring(false);
            controller.refresh();
            setApi(event.api);
        },
        [controller],
    );

    React.useEffect(
        function attachControllerToDock() {
            if (!api) {
                return;
            }
            // Attached here as well as in `handleReady`: in development, StrictMode runs this cleanup once right after
            // mounting, and dockview does not call `onReady` again
            controller.attach(api);
            return () => controller.detach();
        },
        [api, controller],
    );

    React.useEffect(
        function persistLayout() {
            const storageKey = props.storageKey;
            if (!api || !storageKey) {
                return;
            }
            let timeout: ReturnType<typeof setTimeout> | null = null;
            const disposable = api.onDidLayoutChange(() => {
                if (timeout) {
                    clearTimeout(timeout);
                }
                timeout = setTimeout(() => {
                    saveSettingsDockLayout(storageKey, {
                        dockview: api.toJSON(),
                        lastEdges: controller.getLastEdges(),
                        lastPositions: controller.getLastPositions(),
                        hiddenGroupEdges: controller.getHiddenGroupEdges(),
                        collapsedEdges: controller.getCollapsedEdges(),
                    });
                }, SAVE_LAYOUT_DEBOUNCE_MS);
            });
            return () => {
                disposable.dispose();
                if (timeout) {
                    clearTimeout(timeout);
                }
            };
        },
        [api, controller, props.storageKey],
    );

    React.useEffect(
        function restrictDropTargets() {
            if (!api) {
                return;
            }
            const disposable = api.onWillShowOverlay((event) => {
                // Settings panels may be docked along the module layout's edges, but never stacked into it
                const isModulesGroup = !!event.group && event.group === controller.getModulesGroup();
                if (isModulesGroup && (event.kind !== "content" || event.position === "center")) {
                    event.preventDefault();
                }
            });
            return () => disposable.dispose();
        },
        [api, controller],
    );

    const dockAreaRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(
        function hideFlyoutOnOutsidePointerDown() {
            const dockArea = dockAreaRef.current;
            if (!dockArea) {
                return;
            }
            function handlePointerDown(event: PointerEvent) {
                if (event.target instanceof Element && event.target.closest("[data-settings-flyout]")) {
                    return;
                }
                controller.closeFlyout();
            }
            // Popups opened from the flyout are rendered outside the dock area, so they do not close it
            dockArea.addEventListener("pointerdown", handlePointerDown, true);
            return () => dockArea.removeEventListener("pointerdown", handlePointerDown, true);
        },
        [controller],
    );

    const getTabContextMenuItems = React.useCallback(
        function getTabContextMenuItems(params: GetTabContextMenuItemsParams) {
            const panelId = params.panel.id;
            if (!controller.isSettingsPanel(panelId)) {
                return [];
            }
            const placement = controller.getPlacement(panelId);
            const moveItems = DOCK_EDGES.filter(
                (edge) => placement?.type !== "docked" || placement.edge !== edge,
            ).map((edge) => ({ label: `Move to ${edge}`, action: () => controller.dockPanel(panelId, edge) }));
            return [
                ...moveItems,
                "separator" as const,
                placement?.type === "floating"
                    ? { label: "Dock", action: () => controller.dockPanel(panelId) }
                    : { label: "Float", action: () => controller.floatPanel(panelId) },
                { label: "Close", action: () => controller.closePanel(panelId) },
            ];
        },
        [controller],
    );

    return (
        <SettingsDockContext.Provider value={contextValue}>
            <div className="flex h-full min-h-0 w-full min-w-0 flex-col">
                <SettingsRail edge="top" />
                <div className="flex min-h-0 grow">
                    <SettingsRail edge="left" />
                    {/* Isolated, so popups rendered in body (e.g. dropdowns) are never covered by dock overlays */}
                    <div ref={dockAreaRef} className="relative isolate min-w-0 grow" data-testid="settings-dock">
                        <SettingsDockCenterContext.Provider value={props.center}>
                            <DockviewReact
                                className="h-full w-full"
                                theme={SETTINGS_DOCK_THEME}
                                components={COMPONENTS}
                                defaultTabComponent={SettingsTab}
                                rightHeaderActionsComponent={GroupHeaderActions}
                                getTabContextMenuItems={getTabContextMenuItems}
                                onReady={handleReady}
                                dndEdges={LAYOUT_EDGE_OVERLAY_MODEL}
                                dropOverlayModel={(params) =>
                                    params.group && params.group === controller.getModulesGroup()
                                        ? MODULES_EDGE_OVERLAY_MODEL
                                        : undefined
                                }
                                floatingGroupBounds="boundedWithinViewport"
                            />
                        </SettingsDockCenterContext.Provider>
                        <SettingsFlyout />
                    </div>
                    <SettingsRail edge="right" />
                </div>
                <SettingsRail edge="bottom" />
            </div>
            {props.panels.map((panel) => (
                <React.Fragment key={panel.id}>{createPortal(panel.content, registry.getElement(panel.id))}</React.Fragment>
            ))}
        </SettingsDockContext.Provider>
    );
}
