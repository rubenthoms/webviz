import type { DockviewApi, DockviewGroupPanel, IDockviewPanel } from "dockview-react";

type Disposable = { dispose(): void };

/** A side of the module layout */
export type DockEdge = "left" | "right" | "top" | "bottom";

export const DOCK_EDGES: readonly DockEdge[] = ["left", "right", "top", "bottom"];

/** The module layout's panel, which always has a group of its own in the center of the grid */
export const MODULES_PANEL_ID = "modules";
export const MODULES_PANEL_COMPONENT = "modules";
export const SETTINGS_PANEL_COMPONENT = "settings";

const DEFAULT_SIZE_PX: Record<DockEdge, number> = { left: 360, right: 380, top: 260, bottom: 260 };
/** Groups created by a drop are given their default size if dockview's split made them larger than this */
const MAX_NEW_GROUP_SHARE = 0.34;
const FLOATING_SIZE_PX = { width: 360, height: 480 };
const SIDE_TOLERANCE_PX = 2;

export type SettingsPanelPlacement =
    | { type: "docked"; edge: DockEdge | null; isHidden: boolean }
    | { type: "floating" };

export type SettingsDockSnapshot = {
    /** Panels that are part of the layout, i.e. not closed */
    openPanelIds: readonly string[];
    /** Panels in a shown group (docked or floating), whether or not they are the group's active tab */
    shownPanelIds: readonly string[];
    /** Panels the user can see: the active tab of a shown group */
    visiblePanelIds: readonly string[];
    /** Every panel by the side its rail icon is shown on: where it is docked, or was last docked */
    panelIdsByEdge: Readonly<Record<DockEdge, readonly string[]>>;
    /** Collapsed sides: their groups are hidden, and their panels open as a flyout over the modules */
    collapsedEdges: readonly DockEdge[];
    flyout: SettingsDockFlyout | null;
};

/** A panel of a collapsed side, shown over the modules without changing the layout */
export type SettingsDockFlyout = { panelId: string; edge: DockEdge };

/** What collapsing a side hid, so expanding it brings back exactly that */
export type CollapsedEdgeState = { groupIds: string[]; size: number };

export type SettingsPanelDefaults = { id: string; title: string; defaultEdge: DockEdge };

export type FloatingBox = { x: number; y: number; width: number; height: number };

/** Where a panel was taken out of the layout, so it can be put back in the same place */
export type SettingsPanelLastPosition =
    | { type: "docked"; groupId: string; index: number }
    | { type: "floating"; groupId: string; box: FloatingBox };

function isHorizontalEdge(edge: DockEdge): boolean {
    return edge === "left" || edge === "right";
}

function arraysAreEqual(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && a.every((value, index) => value === b[index]);
}

function makeEmptyEdgeRecord(): Record<DockEdge, string[]> {
    return { left: [], right: [], top: [], bottom: [] };
}

/**
 * Owns the settings dock's dockview instance. The grid's center group holds only the module layout; settings groups
 * are split around it (and next to/below each other) on its four sides, or float above it.
 *
 * Every panel has an icon in the rail of its side. Hiding a panel hides its group (keeping its place in the layout),
 * so showing it again brings it back exactly where it was. Closing a panel removes it; it reopens on the same side.
 */
export class SettingsDockController {
    private _api: DockviewApi | null = null;
    private _apiDisposables: Disposable[] = [];
    private _panels = new Map<string, SettingsPanelDefaults>();
    private _lastEdges: Partial<Record<string, DockEdge>> = {};
    private _lastPositions = new Map<string, SettingsPanelLastPosition>();
    /** Hidden groups have no size, so their side is recorded when they are hidden */
    private _hiddenGroupEdges = new Map<string, DockEdge>();
    private _closeGuards = new Map<string, () => boolean>();
    private _collapsedEdges = new Map<DockEdge, CollapsedEdgeState>();
    private _flyout: SettingsDockFlyout | null = null;
    /** Sizes of the shown docked groups as of the last refresh, to undo dockview's redistribution on removal */
    private _groupSizes = new Map<string, { width: number; height: number }>();
    private _sizesToRestore: Map<string, { width: number; height: number }> | null = null;
    private _isRestoring = false;
    private _isRefreshScheduled = false;
    private _listeners = new Set<() => void>();
    private _snapshot: SettingsDockSnapshot = {
        openPanelIds: [],
        shownPanelIds: [],
        visiblePanelIds: [],
        panelIdsByEdge: makeEmptyEdgeRecord(),
        collapsedEdges: [],
        flyout: null,
    };

    subscribe = (listener: () => void): (() => void) => {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    };

    getSnapshot = (): SettingsDockSnapshot => {
        return this._snapshot;
    };

    setPanelDefaults(panels: SettingsPanelDefaults[]): void {
        this._panels = new Map(panels.map((panel) => [panel.id, panel]));
        this.scheduleRefresh();
    }

    isSettingsPanel(panelId: string): boolean {
        return this._panels.has(panelId);
    }

    getApi(): DockviewApi | null {
        return this._api;
    }

    getLastEdges(): Partial<Record<string, DockEdge>> {
        return { ...this._lastEdges };
    }

    setLastEdges(lastEdges: Partial<Record<string, DockEdge>>): void {
        this._lastEdges = { ...lastEdges };
        this.scheduleRefresh();
    }

    getLastPositions(): Record<string, SettingsPanelLastPosition> {
        return Object.fromEntries(this._lastPositions);
    }

    setLastPositions(lastPositions: Record<string, SettingsPanelLastPosition>): void {
        this._lastPositions = new Map(Object.entries(lastPositions));
    }

    getCollapsedEdges(): Partial<Record<DockEdge, CollapsedEdgeState>> {
        return Object.fromEntries(this._collapsedEdges);
    }

    setCollapsedEdges(collapsedEdges: Partial<Record<DockEdge, CollapsedEdgeState>>): void {
        this._collapsedEdges = new Map(Object.entries(collapsedEdges) as [DockEdge, CollapsedEdgeState][]);
        this._flyout = null;
        this.scheduleRefresh();
    }

    /** The width (left/right) or height (top/bottom) the side had before it was collapsed */
    getCollapsedEdgeSize(edge: DockEdge): number {
        return this._collapsedEdges.get(edge)?.size ?? DEFAULT_SIZE_PX[edge];
    }

    getHiddenGroupEdges(): Record<string, DockEdge> {
        return Object.fromEntries(this._hiddenGroupEdges);
    }

    setHiddenGroupEdges(hiddenGroupEdges: Record<string, DockEdge>): void {
        this._hiddenGroupEdges = new Map(Object.entries(hiddenGroupEdges));
        this.scheduleRefresh();
    }

    /** Set while a layout is created or restored, so restored groups keep their stored size */
    setRestoring(isRestoring: boolean): void {
        this._isRestoring = isRestoring;
    }

    attach(api: DockviewApi): void {
        this.detach();
        this._api = api;

        const scheduleRefresh = () => this.scheduleRefresh();
        this._apiDisposables = [
            api.onDidAddPanel(scheduleRefresh),
            api.onDidRemovePanel(scheduleRefresh),
            api.onDidMovePanel(scheduleRefresh),
            api.onDidActivePanelChange(scheduleRefresh),
            api.onDidLayoutChange(scheduleRefresh),
            api.onDidAddGroup((group) => {
                if (!this._isRestoring) {
                    queueMicrotask(() => this.applyDefaultSizeToNewGroup(group));
                }
                this.scheduleRefresh();
            }),
            api.onWillDragPanel(() => this.closeFlyout()),
            api.onWillDragGroup(() => this.closeFlyout()),
            api.onDidRemoveGroup((group) => {
                this._hiddenGroupEdges.delete(group.id);
                // Dockview spreads a removed group's space over its neighbours, also onto other settings; restoring
                // their sizes hands it all to the module layout
                this._sizesToRestore ??= new Map(this._groupSizes);
                this.scheduleRefresh();
            }),
        ];
        this.refresh();
    }

    detach(): void {
        this._apiDisposables.forEach((disposable) => disposable.dispose());
        this._apiDisposables = [];
        this._api = null;
    }

    getModulesGroup(): DockviewGroupPanel | undefined {
        return this._api?.getPanel(MODULES_PANEL_ID)?.group;
    }

    /** Settings groups docked in the grid (shown or hidden), i.e. all groups except the module layout's and floating */
    getDockedGroups(): DockviewGroupPanel[] {
        const modulesGroup = this.getModulesGroup();
        return (this._api?.groups ?? []).filter(
            (group) => group !== modulesGroup && group.api.location.type === "grid",
        );
    }

    /** Which side of the module layout a docked group is on, judged by where it is rendered */
    getGroupEdge(group: DockviewGroupPanel): DockEdge | null {
        if (!group.api.isVisible) {
            return this._hiddenGroupEdges.get(group.id) ?? null;
        }
        const modulesElement = this.getModulesGroup()?.element;
        if (!modulesElement) {
            return null;
        }
        const modules = modulesElement.getBoundingClientRect();
        const rect = group.element.getBoundingClientRect();
        if (modules.width === 0 || rect.width === 0) {
            return null;
        }
        if (rect.right <= modules.left + SIDE_TOLERANCE_PX) {
            return "left";
        }
        if (rect.left >= modules.right - SIDE_TOLERANCE_PX) {
            return "right";
        }
        if (rect.bottom <= modules.top + SIDE_TOLERANCE_PX) {
            return "top";
        }
        if (rect.top >= modules.bottom - SIDE_TOLERANCE_PX) {
            return "bottom";
        }
        return null;
    }

    getGroupPlacement(group: DockviewGroupPanel): SettingsPanelPlacement | null {
        const locationType = group.api.location.type;
        if (locationType === "floating") {
            return { type: "floating" };
        }
        if (locationType !== "grid" || group === this.getModulesGroup()) {
            return null;
        }
        return { type: "docked", edge: this.getGroupEdge(group), isHidden: !group.api.isVisible };
    }

    getPlacement(panelId: string): SettingsPanelPlacement | null {
        const panel = this._api?.getPanel(panelId);
        return panel ? this.getGroupPlacement(panel.group) : null;
    }

    /** Shows the panel where it was: in its last group if that still exists, otherwise on its side */
    showPanel(panelId: string): void {
        const api = this._api;
        const defaults = this._panels.get(panelId);
        if (!api || !defaults) {
            return;
        }

        let panel = api.getPanel(panelId);
        const lastPosition = this._lastPositions.get(panelId);
        if (!panel && lastPosition?.type === "floating") {
            // Back into its floating window if that still has other panels, otherwise a new one in the same place
            const lastGroup = this.getFloatingGroup(lastPosition.groupId);
            panel = lastGroup
                ? api.addPanel({
                      id: panelId,
                      component: SETTINGS_PANEL_COMPONENT,
                      title: defaults.title,
                      position: { referenceGroup: lastGroup },
                  })
                : api.addPanel({
                      id: panelId,
                      component: SETTINGS_PANEL_COMPONENT,
                      title: defaults.title,
                      floating: this.clampFloatingBox(lastPosition.box),
                  });
        }
        const lastDockedGroup =
            lastPosition?.type === "docked" ? this.getDockedGroup(lastPosition.groupId) : undefined;
        if (!panel && lastPosition?.type === "docked" && lastDockedGroup) {
            panel = api.addPanel({
                id: panelId,
                component: SETTINGS_PANEL_COMPONENT,
                title: defaults.title,
                position: {
                    referenceGroup: lastDockedGroup,
                    index: Math.min(lastPosition.index, lastDockedGroup.panels.length),
                },
            });
        }
        if (!panel) {
            panel = this.addPanelToEdge(panelId, this.resolveEdge(panelId));
        }
        if (!panel) {
            return;
        }

        const placement = this.getGroupPlacement(panel.group);
        if (placement?.type === "docked" && placement.edge && this._collapsedEdges.has(placement.edge)) {
            this.openFlyout(panel, placement.edge);
            return;
        }
        if (this._flyout?.panelId === panelId) {
            this._flyout = null;
        }
        this.showGroup(panel.group);
        this.activatePanel(panel);
        this.refresh();
    }

    /** Hides the flyout; its panel stays in its (hidden) group */
    closeFlyout(): void {
        if (!this._flyout) {
            return;
        }
        this._flyout = null;
        this.refresh();
    }

    /**
     * Hides the panel. A docked group is hidden if the panel is alone in it, which keeps the group's place in the
     * layout; otherwise (and for floating panels) only the panel is taken out, remembering its position (e.g. the
     * floating window's). Its content stays mounted either way.
     */
    hidePanel(panelId: string): void {
        const panel = this._api?.getPanel(panelId);
        if (!panel) {
            return;
        }
        if (this._flyout?.panelId === panelId) {
            this.closeFlyout();
            return;
        }
        if (panel.group.api.location.type === "grid" && panel.group.panels.length === 1) {
            this.hideGroup(panel.group);
            this.refresh();
            return;
        }
        this.closePanel(panelId, { force: true });
    }

    /** The rail's toggle: hides a shown panel, shows any other */
    togglePanel(panelId: string): void {
        if (this._snapshot.shownPanelIds.includes(panelId)) {
            this.hidePanel(panelId);
            return;
        }
        this.showPanel(panelId);
    }

    /**
     * Collapses a side: its groups are hidden (keeping their place), and until the side is expanded again its panels
     * open as a flyout over the modules.
     */
    collapseEdge(edge: DockEdge): void {
        const groups = this.getDockedGroups().filter(
            (group) => group.api.isVisible && this.getGroupEdge(group) === edge,
        );
        const sizes = groups.map((group) => (isHorizontalEdge(edge) ? group.width : group.height));
        const previous = this._collapsedEdges.get(edge);
        groups.forEach((group) => this.hideGroup(group));
        this._collapsedEdges.set(edge, {
            groupIds: [...(previous?.groupIds ?? []), ...groups.map((group) => group.id)],
            size: sizes.length > 0 ? Math.max(...sizes) : (previous?.size ?? DEFAULT_SIZE_PX[edge]),
        });
        if (this._flyout?.edge === edge) {
            this._flyout = null;
        }
        this.refresh();
    }

    /** Shows the groups that collapsing the side hid, and docks the flyout's panel if it is open there */
    expandEdge(edge: DockEdge): void {
        const collapsed = this._collapsedEdges.get(edge);
        if (!collapsed) {
            return;
        }
        const flyoutPanelId = this._flyout?.edge === edge ? this._flyout.panelId : null;
        this._collapsedEdges.delete(edge);
        if (flyoutPanelId) {
            this._flyout = null;
        }

        for (const groupId of collapsed.groupIds) {
            const group = this.getDockedGroup(groupId);
            if (group) {
                this.showGroup(group);
            }
        }
        const flyoutPanel = flyoutPanelId ? this._api?.getPanel(flyoutPanelId) : undefined;
        if (flyoutPanel) {
            this.showGroup(flyoutPanel.group);
            this.activatePanel(flyoutPanel);
        }
        this.refresh();
    }

    /** Closes the panel; it stays in the rail. Returns false if a close guard (e.g. unsaved changes) kept it open. */
    closePanel(panelId: string, options?: { force?: boolean }): boolean {
        const panel = this._api?.getPanel(panelId);
        if (!panel) {
            return true;
        }
        if (!options?.force) {
            const guard = this._closeGuards.get(panelId);
            if (guard && !guard()) {
                return false;
            }
        }

        this.rememberPosition(panel);
        this._api?.removePanel(panel);
        this.scheduleRefresh();
        return true;
    }

    floatPanel(panelId: string): void {
        const api = this._api;
        const panel = api?.getPanel(panelId);
        if (!api || !panel) {
            return;
        }

        this.rememberPosition(panel);
        const width = Math.min(FLOATING_SIZE_PX.width, api.width);
        const height = Math.min(FLOATING_SIZE_PX.height, api.height);
        api.addFloatingGroup(panel, {
            width,
            height,
            x: Math.max(0, (api.width - width) / 2),
            y: Math.max(0, (api.height - height) / 4),
        });
        panel.api.setActive();
        this.scheduleRefresh();
    }

    /** Moves the panel to a side and shows it there; by default back into the group it was last docked in */
    dockPanel(panelId: string, edge?: DockEdge): void {
        const api = this._api;
        const panel = api?.getPanel(panelId);
        if (!api || !panel) {
            return;
        }

        const targetEdge = edge ?? this.resolveEdge(panelId);
        const placement = this.getGroupPlacement(panel.group);
        if (placement?.type !== "docked" || placement.edge !== targetEdge) {
            const lastPosition = this._lastPositions.get(panelId);
            const lastGroup =
                lastPosition?.type === "docked" ? this.getDockedGroup(lastPosition.groupId) : undefined;
            const group =
                (!edge && lastGroup) ||
                this.findTargetGroup(targetEdge, panel.group) ||
                this.addGroupAtEdge(targetEdge);
            this.showGroup(group);
            const index = lastGroup === group && lastPosition?.type === "docked" ? lastPosition.index : undefined;
            panel.api.moveTo({ group, position: "center", index });
        }
        this.showGroup(panel.group);
        this.activatePanel(panel);
        this.refresh();
    }

    dockGroup(group: DockviewGroupPanel): void {
        for (const panel of [...group.panels]) {
            this.dockPanel(panel.id);
        }
    }

    /** A guard returns false to cancel closing, e.g. to ask about unsaved changes first */
    registerCloseGuard(panelId: string, guard: () => boolean): () => void {
        this._closeGuards.set(panelId, guard);
        return () => {
            if (this._closeGuards.get(panelId) === guard) {
                this._closeGuards.delete(panelId);
            }
        };
    }

    scheduleRefresh(): void {
        if (this._isRefreshScheduled) {
            return;
        }
        this._isRefreshScheduled = true;
        queueMicrotask(() => {
            this._isRefreshScheduled = false;
            this.refresh();
        });
    }

    refresh(): void {
        const api = this._api;
        // Tags the settings groups for styling, so styles never reach the nested module layout's groups
        const modulesGroup = this.getModulesGroup();
        for (const group of api?.groups ?? []) {
            group.element.classList.toggle("settings-dock-group", group !== modulesGroup);
        }
        this.restoreAndRecordGroupSizes();

        this.syncCollapsedEdges();

        const openPanelIds: string[] = [];
        const shownPanelIds: string[] = [];
        const visiblePanelIds: string[] = [];
        const panelIdsByEdge = makeEmptyEdgeRecord();

        for (const panelId of this._panels.keys()) {
            const panel = api?.getPanel(panelId);
            const placement = panel ? this.getGroupPlacement(panel.group) : null;
            if (panel) {
                openPanelIds.push(panelId);
                const isGroupShown =
                    placement?.type === "floating" || (placement?.type === "docked" && !placement.isHidden);
                if (isGroupShown) {
                    shownPanelIds.push(panelId);
                    if (panel.group.activePanel?.id === panelId) {
                        visiblePanelIds.push(panelId);
                    }
                } else if (this._flyout?.panelId === panelId) {
                    shownPanelIds.push(panelId);
                    visiblePanelIds.push(panelId);
                }
            }
            if (placement?.type === "docked" && placement.edge) {
                this._lastEdges[panelId] = placement.edge;
            }
            panelIdsByEdge[this.resolveEdge(panelId)].push(panelId);
        }

        const collapsedEdges = DOCK_EDGES.filter((edge) => this._collapsedEdges.has(edge));
        const flyout = this._flyout;

        const previous = this._snapshot;
        if (
            arraysAreEqual(previous.collapsedEdges, collapsedEdges) &&
            previous.flyout?.panelId === flyout?.panelId &&
            previous.flyout?.edge === flyout?.edge &&
            arraysAreEqual(previous.openPanelIds, openPanelIds) &&
            arraysAreEqual(previous.shownPanelIds, shownPanelIds) &&
            arraysAreEqual(previous.visiblePanelIds, visiblePanelIds) &&
            DOCK_EDGES.every((edge) => arraysAreEqual(previous.panelIdsByEdge[edge], panelIdsByEdge[edge]))
        ) {
            return;
        }
        this._snapshot = {
            openPanelIds,
            shownPanelIds,
            visiblePanelIds,
            panelIdsByEdge,
            collapsedEdges,
            flyout: flyout ? { ...flyout } : null,
        };
        this._listeners.forEach((listener) => listener());
    }

    private openFlyout(panel: IDockviewPanel, edge: DockEdge): void {
        // A group just created on the collapsed side (e.g. for a reopened panel) is part of the collapsed side
        if (panel.group.api.isVisible) {
            this.hideGroup(panel.group);
            const collapsed = this._collapsedEdges.get(edge);
            if (collapsed && !collapsed.groupIds.includes(panel.group.id)) {
                collapsed.groupIds.push(panel.group.id);
            }
        }
        // Makes it the group's active tab, so it is the one shown once the side is expanded
        panel.group.model.openPanel(panel);
        this._flyout = { panelId: panel.id, edge };
        this.refresh();
    }

    /**
     * A side stops being collapsed when a group is shown on it by other means (e.g. a panel is dropped there), and the
     * flyout closes when its panel is no longer on a collapsed side.
     */
    private syncCollapsedEdges(): void {
        for (const group of this.getDockedGroups()) {
            const edge = group.api.isVisible ? this.getGroupEdge(group) : null;
            if (edge && this._collapsedEdges.has(edge)) {
                this._collapsedEdges.delete(edge);
            }
        }
        const flyout = this._flyout;
        if (flyout) {
            const placement = this.getPlacement(flyout.panelId);
            if (placement?.type !== "docked" || placement.edge !== flyout.edge || !this._collapsedEdges.has(flyout.edge)) {
                this._flyout = null;
            }
        }
    }

    private restoreAndRecordGroupSizes(): void {
        const shownGroups = this.getDockedGroups().filter((group) => group.api.isVisible);
        const sizesToRestore = this._sizesToRestore;
        this._sizesToRestore = null;
        if (sizesToRestore) {
            for (const group of shownGroups) {
                const size = sizesToRestore.get(group.id);
                const edge = this.getGroupEdge(group);
                if (!size || !edge) {
                    continue;
                }
                if (isHorizontalEdge(edge) && group.width !== size.width) {
                    group.api.setSize({ width: size.width });
                } else if (!isHorizontalEdge(edge) && group.height !== size.height) {
                    group.api.setSize({ height: size.height });
                }
            }
        }
        this._groupSizes = new Map(shownGroups.map((group) => [group.id, { width: group.width, height: group.height }]));
    }

    /** Makes the panel its group's shown tab (`panel.api.setActive` only activates the group) */
    private activatePanel(panel: IDockviewPanel): void {
        panel.group.model.openPanel(panel);
        panel.api.setActive();
    }

    private showGroup(group: DockviewGroupPanel): void {
        if (group.api.location.type === "grid" && !group.api.isVisible) {
            group.api.setVisible(true);
            this._hiddenGroupEdges.delete(group.id);
        }
    }

    private hideGroup(group: DockviewGroupPanel): void {
        if (group.api.location.type !== "grid" || !group.api.isVisible || group === this.getModulesGroup()) {
            return;
        }
        const edge = this.getGroupEdge(group);
        if (edge) {
            this._hiddenGroupEdges.set(group.id, edge);
        }
        group.api.setVisible(false);
    }

    /** Dockview splits the drop target in half; a new settings group should not take half the module area */
    private applyDefaultSizeToNewGroup(group: DockviewGroupPanel): void {
        const api = this._api;
        if (!api || group.api.location.type !== "grid" || group === this.getModulesGroup()) {
            return;
        }
        const edge = this.getGroupEdge(group);
        if (!edge) {
            return;
        }
        if (isHorizontalEdge(edge) && group.width > api.width * MAX_NEW_GROUP_SHARE) {
            group.api.setSize({ width: DEFAULT_SIZE_PX[edge] });
        } else if (!isHorizontalEdge(edge) && group.height > api.height * MAX_NEW_GROUP_SHARE) {
            group.api.setSize({ height: DEFAULT_SIZE_PX[edge] });
        }
    }

    private resolveEdge(panelId: string): DockEdge {
        return this._lastEdges[panelId] ?? this._panels.get(panelId)?.defaultEdge ?? "left";
    }

    private rememberPosition(panel: IDockviewPanel): void {
        const placement = this.getGroupPlacement(panel.group);
        if (placement?.type === "floating") {
            const box = this.getFloatingBox(panel.group);
            if (box) {
                this._lastPositions.set(panel.id, { type: "floating", groupId: panel.group.id, box });
            }
            return;
        }
        if (placement?.type !== "docked") {
            return;
        }
        if (placement.edge) {
            this._lastEdges[panel.id] = placement.edge;
        }
        this._lastPositions.set(panel.id, {
            type: "docked",
            groupId: panel.group.id,
            index: panel.group.panels.indexOf(panel),
        });
    }

    private getDockedGroup(groupId: string): DockviewGroupPanel | undefined {
        return this.getDockedGroups().find((group) => group.id === groupId);
    }

    private getFloatingGroup(groupId: string): DockviewGroupPanel | undefined {
        return this._api?.groups.find((group) => group.id === groupId && group.api.location.type === "floating");
    }

    /** The floating window around the group (including its title bar), relative to the layer it is positioned in */
    private getFloatingBox(group: DockviewGroupPanel): FloatingBox | null {
        const floatingWindow = group.element.closest(".dv-resize-container");
        const floatingLayer = floatingWindow?.parentElement;
        if (!floatingWindow || !floatingLayer) {
            return null;
        }
        const windowRect = floatingWindow.getBoundingClientRect();
        const layerRect = floatingLayer.getBoundingClientRect();
        return {
            x: windowRect.left - layerRect.left,
            y: windowRect.top - layerRect.top,
            width: windowRect.width,
            height: windowRect.height,
        };
    }

    /** Keeps a remembered floating window inside the dock, which may have been resized since */
    private clampFloatingBox(box: FloatingBox): FloatingBox {
        const api = this._api as DockviewApi;
        const width = Math.min(box.width, api.width);
        const height = Math.min(box.height, api.height);
        return {
            width,
            height,
            x: Math.min(Math.max(0, box.x), api.width - width),
            y: Math.min(Math.max(0, box.y), api.height - height),
        };
    }

    /** A group on the side to add a panel to as a tab: preferably a shown one, then the largest */
    private findTargetGroup(edge: DockEdge, exclude?: DockviewGroupPanel): DockviewGroupPanel | undefined {
        const candidates = this.getDockedGroups().filter(
            (group) => group !== exclude && this.getGroupEdge(group) === edge,
        );
        return candidates.sort(
            (a, b) =>
                Number(b.api.isVisible) - Number(a.api.isVisible) || b.width * b.height - a.width * a.height,
        )[0];
    }

    /** A new group directly next to the module layout */
    private addGroupAtEdge(edge: DockEdge): DockviewGroupPanel {
        const api = this._api as DockviewApi;
        const modulesGroup = this.getModulesGroup();
        const size = isHorizontalEdge(edge)
            ? { initialWidth: DEFAULT_SIZE_PX[edge] }
            : { initialHeight: DEFAULT_SIZE_PX[edge] };
        const direction = edge === "top" ? "above" : edge === "bottom" ? "below" : edge;
        return modulesGroup
            ? api.addGroup({ referenceGroup: modulesGroup, direction, ...size })
            : api.addGroup({ direction, ...size });
    }

    private addPanelToEdge(panelId: string, edge: DockEdge): IDockviewPanel | undefined {
        const api = this._api;
        const defaults = this._panels.get(panelId);
        if (!api || !defaults) {
            return undefined;
        }
        const group = this.findTargetGroup(edge) ?? this.addGroupAtEdge(edge);
        this.showGroup(group);
        return api.addPanel({
            id: panelId,
            component: SETTINGS_PANEL_COMPONENT,
            title: defaults.title,
            position: { referenceGroup: group },
        });
    }
}
