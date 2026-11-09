import type { DockviewApi } from "dockview-react";
import { LocalSelectionTransfer, PanelTransfer } from "dockview-react";

/** Data type for modules dragged from the modules list. Only the type is readable during `dragover`. */
export const NEW_MODULE_DRAG_TYPE = "application/x-webviz-module";

let draggedNewModuleName: string | null = null;

export function startNewModuleDrag(event: React.DragEvent, moduleName: string): void {
    draggedNewModuleName = moduleName;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(NEW_MODULE_DRAG_TYPE, moduleName);
}

export function endNewModuleDrag(): void {
    draggedNewModuleName = null;
}

export function isNewModuleDrag(event: DragEvent | PointerEvent): boolean {
    if (event instanceof DragEvent) {
        return event.dataTransfer?.types.includes(NEW_MODULE_DRAG_TYPE) ?? false;
    }
    return draggedNewModuleName !== null;
}

export function getDraggedNewModuleName(event: DragEvent | PointerEvent): string | null {
    if (event instanceof DragEvent) {
        const name = event.dataTransfer?.getData(NEW_MODULE_DRAG_TYPE);
        if (name) {
            return name;
        }
    }
    return draggedNewModuleName;
}

const panelTransfer = LocalSelectionTransfer.getInstance<PanelTransfer>();

/**
 * Starts a dockview panel drag from our own module header, the same way dockview's (hidden) tab does. Dockview's
 * drop targets then treat it as an internal move, so they show the regular overlays and move the panel themselves.
 */
export function startModulePanelDrag(
    event: React.DragEvent,
    api: DockviewApi,
    moduleInstanceId: string,
    dragImage: HTMLElement | null,
): boolean {
    const panel = api.getPanel(moduleInstanceId);
    if (!panel) {
        return false;
    }

    panelTransfer.setData([new PanelTransfer(api.id, panel.group.id, panel.id)], PanelTransfer.prototype);

    event.dataTransfer.effectAllowed = "move";
    // Some browsers do not start a drag without any data
    event.dataTransfer.setData("text/plain", "");
    if (dragImage) {
        const rect = dragImage.getBoundingClientRect();
        event.dataTransfer.setDragImage(dragImage, event.clientX - rect.left, event.clientY - rect.top);
    }
    return true;
}

export function endModulePanelDrag(): void {
    // Deferred like dockview does, so drop handlers that run after `dragend` can still read the transfer
    setTimeout(() => panelTransfer.clearData(PanelTransfer.prototype), 0);
}
