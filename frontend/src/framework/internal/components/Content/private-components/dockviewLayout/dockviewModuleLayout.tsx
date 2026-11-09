import React from "react";

import type {
    DockviewApi,
    DockviewDidDropEvent,
    DockviewDndOverlayEvent,
    DockviewGroupPanel,
    DockviewReadyEvent,
    DockviewTheme,
    DockviewWillShowOverlayLocationEvent,
    IDockviewPanelProps,
    Position,
} from "dockview-react";
import { DockviewReact, Orientation, getPanelData } from "dockview-react";

import type { LayoutElement } from "@framework/internal/Dashboard";

import { endModulePanelDrag, getDraggedNewModuleName, isNewModuleDrag, startModulePanelDrag } from "./dragAndDrop";
import {
    MODULE_PANEL_COMPONENT,
    dockviewToFlatLayout,
    flatLayoutToDockview,
    layoutsAreEquivalent,
} from "./layoutConversion";

const WEBVIZ_DOCKVIEW_THEME: DockviewTheme = {
    name: "webviz",
    className: "dockview-theme-webviz",
};

// Content drop zones: the outer quarter of a module splits it. Tabs are not used, so there is no center zone.
const CONTENT_DROP_OVERLAY_MODEL = {
    activationSize: { type: "percentage", value: 25 },
    size: { type: "percentage", value: 50 },
} as const;

// Within this distance of the layout's border, a drop docks the module along that whole side of the layout.
// Dockview's own edge target cannot be used: module content is rendered outside its element (see the "always"
// renderer), so it never receives drag events over modules.
const LAYOUT_EDGE_ACTIVATION_PX = 16;

type LayoutEdge = "top" | "bottom" | "left" | "right";

type LayoutEdgePreview = { edge: LayoutEdge; fraction: number };

function findNearLayoutEdge(event: DragEvent | PointerEvent, container: HTMLElement | null): LayoutEdge | null {
    if (!container) {
        return null;
    }
    const rect = container.getBoundingClientRect();
    const distances: [LayoutEdge, number][] = [
        ["left", event.clientX - rect.left],
        ["right", rect.right - event.clientX],
        ["top", event.clientY - rect.top],
        ["bottom", rect.bottom - event.clientY],
    ];
    const [edge, distance] = distances.reduce((closest, candidate) =>
        candidate[1] < closest[1] ? candidate : closest,
    );
    return distance >= 0 && distance < LAYOUT_EDGE_ACTIVATION_PX ? edge : null;
}

/** The share of the layout a module docked along the given edge will get, mirroring dockview's sizing */
function computeLayoutEdgeDockFraction(api: DockviewApi, edge: LayoutEdge): number {
    const grid = api.toJSON().grid;
    const edgeOrientation = edge === "left" || edge === "right" ? Orientation.HORIZONTAL : Orientation.VERTICAL;
    if (grid.orientation === edgeOrientation) {
        // Added to the root's children, which are then distributed evenly
        return 1 / ((grid.root.data as unknown[]).length + 1);
    }
    // The root is wrapped together with the new module, which then get half each
    return 0.5;
}

function makeLayoutEdgePreviewStyle(preview: LayoutEdgePreview): React.CSSProperties {
    const extent = `${preview.fraction * 100}%`;
    switch (preview.edge) {
        case "left":
            return { left: 0, top: 0, bottom: 0, width: extent };
        case "right":
            return { right: 0, top: 0, bottom: 0, width: extent };
        case "top":
            return { left: 0, right: 0, top: 0, height: extent };
        case "bottom":
            return { left: 0, right: 0, bottom: 0, height: extent };
    }
}

export type ModuleDragHandlers = {
    onDragStart: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragEnd: (event: React.DragEvent<HTMLDivElement>) => void;
};

export type DockviewModuleLayoutProps = {
    /** The persisted layout. Changes are applied to dockview, user edits are reported via `onLayoutChange`. */
    layout: LayoutElement[];
    onLayoutChange: (layout: LayoutElement[]) => void;
    renderModule: (moduleInstanceId: string, dragHandlers: ModuleDragHandlers) => React.ReactNode;
    /** Creates a module instance for a module dropped from the modules list; returns its id and name, or null */
    onNewModuleDrop: (moduleName: string) => { moduleInstanceId: string; moduleName: string } | null;
    maximizedModuleInstanceId: string | null;
    readOnly: boolean;
    emptyContent?: React.ReactNode;
};

type PanelContextValue = {
    apiRef: React.RefObject<DockviewApi | null>;
    renderModule: DockviewModuleLayoutProps["renderModule"];
    emptyContent: React.ReactNode;
};

const PanelContext = React.createContext<PanelContextValue | null>(null);

function usePanelContext(): PanelContextValue {
    const context = React.useContext(PanelContext);
    if (!context) {
        throw new Error("Module panels must be rendered inside DockviewModuleLayout");
    }
    return context;
}

function ModulePanel(props: IDockviewPanelProps): React.ReactNode {
    const { apiRef, renderModule } = usePanelContext();
    const moduleInstanceId = props.api.id;

    const dragHandlers = React.useMemo<ModuleDragHandlers>(
        () => ({
            onDragStart(event) {
                const api = apiRef.current;
                const header = event.currentTarget.closest<HTMLElement>("[data-module-header]");
                if (!api || !startModulePanelDrag(event, api, moduleInstanceId, header)) {
                    event.preventDefault();
                }
            },
            onDragEnd() {
                endModulePanelDrag();
            },
        }),
        [apiRef, moduleInstanceId],
    );

    return renderModule(moduleInstanceId, dragHandlers);
}

function Watermark(): React.ReactNode {
    return usePanelContext().emptyContent ?? null;
}

const COMPONENTS = { [MODULE_PANEL_COMPONENT]: ModulePanel };

function edgeToDirection(edge: LayoutEdge): "above" | "below" | "left" | "right" {
    switch (edge) {
        case "top":
            return "above";
        case "bottom":
            return "below";
        case "left":
            return "left";
        case "right":
            return "right";
    }
}

function hideGroupHeader(group: DockviewGroupPanel): void {
    group.header.hidden = true;
}

/**
 * Dockview-based module layout. Every module is a single-panel group without a tab header; the module's own header
 * is the drag handle. Dropping on a module's edge splits only that module, dropping on the layout's edge docks along
 * the whole side, and the sashes between modules can be dragged to resize.
 */
export function DockviewModuleLayout(props: DockviewModuleLayoutProps): React.ReactNode {
    const apiRef = React.useRef<DockviewApi | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [api, setApi] = React.useState<DockviewApi | null>(null);
    const [edgePreview, setEdgePreview] = React.useState<LayoutEdgePreview | null>(null);

    const isDndDisabled = props.readOnly || props.maximizedModuleInstanceId !== null;

    // Read from dockview callbacks, which are registered once
    const propsRef = React.useRef(props);
    propsRef.current = props;

    // Set while we change dockview ourselves, so the resulting layout events are not reported as user edits
    const isApplyingRef = React.useRef(false);

    const contextValue = React.useMemo<PanelContextValue>(
        () => ({ apiRef, renderModule: props.renderModule, emptyContent: props.emptyContent }),
        [props.renderModule, props.emptyContent],
    );

    const reportLayout = React.useCallback(function reportLayout() {
        const currentApi = apiRef.current;
        // Read-only layouts are never changed by the user; this also ignores pixel rounding from e.g. sash clicks
        if (!currentApi || isApplyingRef.current || propsRef.current.readOnly) {
            return;
        }
        // Hidden groups are serialized without a usable size, and a hidden dashboard has no size at all
        if (currentApi.hasMaximizedGroup() || currentApi.width <= 0 || currentApi.height <= 0) {
            return;
        }

        const layout = dockviewToFlatLayout(currentApi.toJSON(), (id) => currentApi.getPanel(id)?.title ?? id);
        if (!layoutsAreEquivalent(layout, propsRef.current.layout)) {
            propsRef.current.onLayoutChange(layout);
        }
    }, []);

    const applyLayout = React.useCallback(
        function applyLayout(layout: LayoutElement[]) {
            const currentApi = apiRef.current;
            if (!currentApi) {
                return;
            }

            const panelIds = currentApi.panels.map((panel) => panel.id);
            const current = dockviewToFlatLayout(currentApi.toJSON(), (id) => id);
            if (panelIds.length > 0 && layoutsAreEquivalent(current, layout)) {
                return;
            }

            const layoutIds = layout.map((element) => element.moduleInstanceId);
            const isRemovalOnly = layoutIds.length < panelIds.length && layoutIds.every((id) => panelIds.includes(id));

            if (isRemovalOnly) {
                // Let dockview give the space of removed modules to their neighbours, then report the result
                isApplyingRef.current = true;
                for (const panel of [...currentApi.panels]) {
                    if (!layoutIds.includes(panel.id)) {
                        currentApi.removePanel(panel);
                    }
                }
                isApplyingRef.current = false;
                reportLayout();
                return;
            }

            isApplyingRef.current = true;
            const serialized = flatLayoutToDockview(layout, { width: currentApi.width, height: currentApi.height });
            if (serialized) {
                currentApi.fromJSON(serialized);
            } else {
                currentApi.clear();
            }
            currentApi.groups.forEach(hideGroupHeader);
            isApplyingRef.current = false;
        },
        [reportLayout],
    );

    const handleReady = React.useCallback(
        function handleReady(event: DockviewReadyEvent) {
            apiRef.current = event.api;
            setApi(event.api);
            applyLayout(propsRef.current.layout);
        },
        [applyLayout],
    );

    const addNewModule = React.useCallback(
        function addNewModule(
            moduleName: string,
            placement: { group: DockviewGroupPanel; position: Position } | { layoutEdge: LayoutEdge } | null,
        ) {
            const currentApi = apiRef.current;
            if (!currentApi) {
                return;
            }
            const created = propsRef.current.onNewModuleDrop(moduleName);
            if (!created) {
                return;
            }

            const panelOptions = {
                id: created.moduleInstanceId,
                component: MODULE_PANEL_COMPONENT,
                title: created.moduleName,
                renderer: "always",
            } as const;

            isApplyingRef.current = true;
            if (placement === null || currentApi.groups.length === 0) {
                currentApi.addPanel(panelOptions);
            } else if ("layoutEdge" in placement) {
                currentApi.addPanel({
                    ...panelOptions,
                    position: { direction: edgeToDirection(placement.layoutEdge) },
                });
            } else {
                // Added panels re-split the whole row/column evenly, whereas moves split only the target. Add the
                // module as a temporary tab of the target, then move it to the target's edge like a user drop.
                const panel = currentApi.addPanel({
                    ...panelOptions,
                    position: { referenceGroup: placement.group, direction: "within" },
                });
                panel.api.moveTo({ group: placement.group, position: placement.position });
            }
            isApplyingRef.current = false;
            reportLayout();
        },
        [reportLayout],
    );

    React.useEffect(
        function subscribeToDockviewEvents() {
            if (!api) {
                return;
            }

            function handleWillShowOverlay(event: DockviewWillShowOverlayLocationEvent) {
                // Tab headers are hidden, and center drops would stack modules as tabs
                if (event.kind === "tab" || event.kind === "header_space") {
                    event.preventDefault();
                    return;
                }
                if (event.kind === "content" && event.position === "center") {
                    event.preventDefault();
                    return;
                }
                // Near the layout's border, drops dock along the whole side; handled in `handleLayoutEdgeDocking`
                if (event.kind === "content" && findNearLayoutEdge(event.nativeEvent, containerRef.current)) {
                    event.preventDefault();
                    return;
                }
                // Dockview's edge target is only used to drop into an empty layout
                if (event.kind === "edge" && api && api.groups.length > 0) {
                    event.preventDefault();
                    return;
                }
                // Dropping a module on its own edges would not change anything
                const data = event.getData();
                if (event.kind === "content" && data && event.group && data.groupId === event.group.id) {
                    event.preventDefault();
                }
            }

            function handleUnhandledDragOver(event: DockviewDndOverlayEvent) {
                if (!isNewModuleDrag(event.nativeEvent)) {
                    return;
                }
                const isEmpty = api?.groups.length === 0;
                if (event.position === "center" && !isEmpty) {
                    return;
                }
                event.accept();
            }

            function handleDidDrop(event: DockviewDidDropEvent) {
                const moduleName = getDraggedNewModuleName(event.nativeEvent);
                if (!moduleName) {
                    return;
                }
                if (event.group) {
                    addNewModule(moduleName, { group: event.group, position: event.position });
                } else {
                    addNewModule(moduleName, null);
                }
            }

            const disposables = [
                api.onDidAddGroup(hideGroupHeader),
                api.onWillShowOverlay(handleWillShowOverlay),
                api.onUnhandledDragOver(handleUnhandledDragOver),
                api.onDidDrop(handleDidDrop),
                api.onDidLayoutChange(reportLayout),
            ];
            return function unsubscribeFromDockviewEvents() {
                disposables.forEach((disposable) => disposable.dispose());
            };
        },
        [api, reportLayout, addNewModule],
    );

    React.useEffect(
        function handleLayoutEdgeDocking() {
            const container = containerRef.current;
            if (!api || !container || isDndDisabled) {
                return;
            }
            const currentApi = api;

            function resolveEdgeDrop(event: DragEvent): { edge: LayoutEdge; movedPanelId: string | null } | null {
                if (currentApi.groups.length === 0) {
                    return null;
                }
                const data = getPanelData();
                const movedPanelId = data?.viewId === currentApi.id ? data.panelId : null;
                if (movedPanelId === null && !isNewModuleDrag(event)) {
                    return null;
                }
                // Docking the only module along an edge would not change anything
                if (movedPanelId !== null && currentApi.panels.length < 2) {
                    return null;
                }
                const edge = findNearLayoutEdge(event, container);
                return edge ? { edge, movedPanelId } : null;
            }

            function handleDragOver(event: DragEvent) {
                const drop = resolveEdgeDrop(event);
                if (!drop) {
                    setEdgePreview(null);
                    return;
                }
                // Allows the drop; dockview's own targets have declined it
                event.preventDefault();
                const edge = drop.edge;
                setEdgePreview((prev) =>
                    prev?.edge === edge ? prev : { edge, fraction: computeLayoutEdgeDockFraction(currentApi, edge) },
                );
            }

            function handleDrop(event: DragEvent) {
                const drop = resolveEdgeDrop(event);
                setEdgePreview(null);
                if (!drop) {
                    return;
                }
                event.preventDefault();
                event.stopPropagation();

                const direction = edgeToDirection(drop.edge);
                if (drop.movedPanelId !== null) {
                    const panel = currentApi.getPanel(drop.movedPanelId);
                    if (!panel) {
                        return;
                    }
                    // Same as dockview's own edge docking: a new group along the whole side, then move the module in
                    isApplyingRef.current = true;
                    const group = currentApi.addGroup({ direction });
                    panel.api.moveTo({ group, position: "center" });
                    isApplyingRef.current = false;
                    reportLayout();
                    return;
                }

                const moduleName = getDraggedNewModuleName(event);
                if (moduleName) {
                    addNewModule(moduleName, { layoutEdge: drop.edge });
                }
            }

            function handleDragLeave(event: DragEvent) {
                if (!container?.contains(event.relatedTarget as Node | null)) {
                    setEdgePreview(null);
                }
            }

            function clearEdgePreview() {
                setEdgePreview(null);
            }

            // Capture phase, so the drop is handled before dockview's targets see it
            container.addEventListener("dragover", handleDragOver, true);
            container.addEventListener("drop", handleDrop, true);
            container.addEventListener("dragleave", handleDragLeave);
            document.addEventListener("dragend", clearEdgePreview);
            return function removeLayoutEdgeDockingListeners() {
                container.removeEventListener("dragover", handleDragOver, true);
                container.removeEventListener("drop", handleDrop, true);
                container.removeEventListener("dragleave", handleDragLeave);
                document.removeEventListener("dragend", clearEdgePreview);
                setEdgePreview(null);
            };
        },
        [api, isDndDisabled, reportLayout, addNewModule],
    );

    React.useEffect(
        function applyLayoutFromProps() {
            applyLayout(props.layout);
        },
        [props.layout, applyLayout],
    );

    React.useEffect(
        function applyMaximizedModule() {
            if (!api) {
                return;
            }
            const maximizedId = props.maximizedModuleInstanceId;
            const panel = maximizedId ? api.getPanel(maximizedId) : undefined;
            if (panel) {
                if (!panel.api.isMaximized()) {
                    panel.api.maximize();
                }
                return;
            }
            if (api.hasMaximizedGroup()) {
                api.exitMaximizedGroup();
                // Changes made while maximized (e.g. removed modules) are only reported once restored
                reportLayout();
            }
        },
        [api, props.maximizedModuleInstanceId, props.layout, reportLayout],
    );

    return (
        <PanelContext.Provider value={contextValue}>
            <div ref={containerRef} className="relative h-full w-full">
                <DockviewReact
                    className="h-full w-full"
                    theme={WEBVIZ_DOCKVIEW_THEME}
                    components={COMPONENTS}
                    watermarkComponent={Watermark}
                    onReady={handleReady}
                    defaultRenderer="always"
                    dropSizing="split"
                    disableDnd={isDndDisabled}
                    locked={props.readOnly}
                    dropOverlayModel={() => CONTENT_DROP_OVERLAY_MODEL}
                />
                {edgePreview && (
                    <div
                        className="bg-accent-strong/35 border-accent-strong z-overlay pointer-events-none absolute border-2"
                        style={makeLayoutEdgePreviewStyle(edgePreview)}
                    />
                )}
            </div>
        </PanelContext.Provider>
    );
}
