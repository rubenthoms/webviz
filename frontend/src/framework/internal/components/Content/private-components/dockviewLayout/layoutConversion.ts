import type { GroupviewPanelState, SerializedDockview, SerializedGridObject } from "dockview-react";
import { Orientation } from "dockview-react";

import type { LayoutElement } from "@framework/internal/Dashboard";

type GroupPanelViewState = SerializedDockview["grid"]["root"] extends SerializedGridObject<infer T> ? T : never;

export const MODULE_PANEL_COMPONENT = "module";

// Layout values are persisted as float32, so boundaries are compared with a tolerance
const BOUNDARY_EPSILON = 1e-4;
const LAYOUT_EQUALITY_EPSILON = 1e-3;

// Used when the container has no size yet (e.g. a hidden dashboard). Dockview rescales proportionally once laid out.
const FALLBACK_SIZE_PX = 1000;

type Region = { x: number; y: number; width: number; height: number };

type LayoutNode =
    | { type: "leaf"; element: LayoutElement }
    | { type: "branch"; orientation: Orientation; children: { node: LayoutNode; region: Region }[] };

function orthogonal(orientation: Orientation): Orientation {
    return orientation === Orientation.HORIZONTAL ? Orientation.VERTICAL : Orientation.HORIZONTAL;
}

function elementStart(element: LayoutElement, orientation: Orientation): number {
    return orientation === Orientation.HORIZONTAL ? element.relX : element.relY;
}

function elementEnd(element: LayoutElement, orientation: Orientation): number {
    return orientation === Orientation.HORIZONTAL ? element.relX + element.relWidth : element.relY + element.relHeight;
}

/**
 * Splits the elements into consecutive slices along the given orientation, cutting only where no element crosses.
 * Returns null if no cut is possible.
 */
function sliceAlong(
    elements: LayoutElement[],
    region: Region,
    orientation: Orientation,
): { elements: LayoutElement[]; region: Region }[] | null {
    const sorted = [...elements].sort((a, b) => elementStart(a, orientation) - elementStart(b, orientation));
    const slices: { elements: LayoutElement[]; start: number; end: number }[] = [];

    for (const element of sorted) {
        const start = elementStart(element, orientation);
        const end = elementEnd(element, orientation);
        const current = slices.at(-1);
        if (current && start < current.end - BOUNDARY_EPSILON) {
            current.elements.push(element);
            current.end = Math.max(current.end, end);
        } else {
            slices.push({ elements: [element], start, end });
        }
    }

    if (slices.length < 2) {
        return null;
    }

    const regionStart = orientation === Orientation.HORIZONTAL ? region.x : region.y;
    const regionEnd = orientation === Orientation.HORIZONTAL ? region.x + region.width : region.y + region.height;

    // Each slice extends to the start of the next one, so gaps in the source layout are absorbed instead of lost
    return slices.map((slice, index) => {
        const start = index === 0 ? regionStart : slice.start;
        const end = index === slices.length - 1 ? regionEnd : slices[index + 1].start;
        const sliceRegion: Region =
            orientation === Orientation.HORIZONTAL
                ? { x: start, y: region.y, width: end - start, height: region.height }
                : { x: region.x, y: start, width: region.width, height: end - start };
        return { elements: slice.elements, region: sliceRegion };
    });
}

function stackEvenly(elements: LayoutElement[], region: Region, orientation: Orientation): LayoutNode {
    const sorted = [...elements].sort((a, b) => a.relY - b.relY || a.relX - b.relX);
    const fraction = 1 / sorted.length;
    return {
        type: "branch",
        orientation,
        children: sorted.map((element, index) => ({
            node: { type: "leaf", element },
            region:
                orientation === Orientation.HORIZONTAL
                    ? {
                          x: region.x + index * fraction * region.width,
                          y: region.y,
                          width: fraction * region.width,
                          height: region.height,
                      }
                    : {
                          x: region.x,
                          y: region.y + index * fraction * region.height,
                          width: region.width,
                          height: fraction * region.height,
                      },
        })),
    };
}

/**
 * Builds a split tree from a flat list of rectangles. Valid Webviz layouts are guillotine layouts, which can be cut
 * recursively. Anything else (e.g. corrupt persisted data) falls back to stacking the elements evenly.
 *
 * Branch orientations alternate: once a parent has made every possible cut along its orientation, its children can
 * only be cut across it.
 */
function buildLayoutTree(elements: LayoutElement[], region: Region, parentOrientation: Orientation | null): LayoutNode {
    if (elements.length === 1) {
        return { type: "leaf", element: elements[0] };
    }

    const candidateOrientations =
        parentOrientation === null ? [Orientation.HORIZONTAL, Orientation.VERTICAL] : [orthogonal(parentOrientation)];

    for (const orientation of candidateOrientations) {
        const slices = sliceAlong(elements, region, orientation);
        if (slices) {
            return {
                type: "branch",
                orientation,
                children: slices.map((slice) => ({
                    node: buildLayoutTree(slice.elements, slice.region, orientation),
                    region: slice.region,
                })),
            };
        }
    }

    return stackEvenly(elements, region, candidateOrientations[0]);
}

export function makeGroupId(moduleInstanceId: string): string {
    return `group-${moduleInstanceId}`;
}

export function makeModulePanelState(moduleInstanceId: string, title: string): GroupviewPanelState {
    return {
        id: moduleInstanceId,
        contentComponent: MODULE_PANEL_COMPONENT,
        title,
        renderer: "always",
    };
}

function toSerializedGridObject(
    node: LayoutNode,
    region: Region,
    parentOrientation: Orientation,
    sizePx: { width: number; height: number },
): SerializedGridObject<GroupPanelViewState> {
    const extentPx =
        parentOrientation === Orientation.HORIZONTAL ? region.width * sizePx.width : region.height * sizePx.height;

    if (node.type === "leaf") {
        const moduleInstanceId = node.element.moduleInstanceId;
        return {
            type: "leaf",
            size: extentPx,
            data: {
                id: makeGroupId(moduleInstanceId),
                views: [moduleInstanceId],
                activeView: moduleInstanceId,
                hideHeader: true,
            },
        };
    }

    return {
        type: "branch",
        size: extentPx,
        data: node.children.map((child) => toSerializedGridObject(child.node, child.region, node.orientation, sizePx)),
    };
}

export function flatLayoutToDockview(
    layout: LayoutElement[],
    containerSize: { width: number; height: number },
): SerializedDockview | null {
    if (layout.length === 0) {
        return null;
    }

    const sizePx = {
        width: containerSize.width > 0 ? containerSize.width : FALLBACK_SIZE_PX,
        height: containerSize.height > 0 ? containerSize.height : FALLBACK_SIZE_PX,
    };
    const rootRegion: Region = { x: 0, y: 0, width: 1, height: 1 };
    const tree = buildLayoutTree(layout, rootRegion, null);

    // Dockview's root is always a branch; a single module becomes a branch with one leaf
    const rootOrientation = tree.type === "branch" ? tree.orientation : Orientation.HORIZONTAL;
    const rootChildren =
        tree.type === "branch"
            ? tree.children.map((child) => toSerializedGridObject(child.node, child.region, rootOrientation, sizePx))
            : [toSerializedGridObject(tree, rootRegion, rootOrientation, sizePx)];

    const panels: Record<string, GroupviewPanelState> = {};
    for (const element of layout) {
        panels[element.moduleInstanceId] = makeModulePanelState(element.moduleInstanceId, element.moduleName);
    }

    return {
        grid: {
            root: {
                type: "branch",
                size: rootOrientation === Orientation.HORIZONTAL ? sizePx.height : sizePx.width,
                data: rootChildren,
            },
            width: sizePx.width,
            height: sizePx.height,
            orientation: rootOrientation,
        },
        panels,
    };
}

function collectLeafRegions(
    node: SerializedGridObject<GroupPanelViewState>,
    region: Region,
    orientation: Orientation,
    result: { panelIds: string[]; region: Region }[],
): void {
    if (node.type === "leaf") {
        result.push({ panelIds: (node.data as GroupPanelViewState).views, region });
        return;
    }

    const children = (node.data as SerializedGridObject<GroupPanelViewState>[]).filter(
        (child) => child.visible !== false,
    );
    const total = children.reduce((sum, child) => sum + (child.size ?? 0), 0);

    let offset = 0;
    for (const child of children) {
        const fraction = total > 0 ? (child.size ?? 0) / total : 1 / children.length;
        const childRegion: Region =
            orientation === Orientation.HORIZONTAL
                ? {
                      x: region.x + offset * region.width,
                      y: region.y,
                      width: fraction * region.width,
                      height: region.height,
                  }
                : {
                      x: region.x,
                      y: region.y + offset * region.height,
                      width: region.width,
                      height: fraction * region.height,
                  };
        offset += fraction;
        collectLeafRegions(child, childRegion, orthogonal(orientation), result);
    }
}

/**
 * Converts dockview's split tree back to the flat format that is persisted. Uses size ratios, so the result does not
 * depend on the container's pixel size.
 */
export function dockviewToFlatLayout(
    serialized: SerializedDockview,
    getModuleName: (moduleInstanceId: string) => string,
): LayoutElement[] {
    const leaves: { panelIds: string[]; region: Region }[] = [];
    collectLeafRegions(serialized.grid.root, { x: 0, y: 0, width: 1, height: 1 }, serialized.grid.orientation, leaves);

    const layout: LayoutElement[] = [];
    for (const leaf of leaves) {
        // Groups hold a single module since center (tab) drops are blocked; extras are stacked defensively
        const count = leaf.panelIds.length;
        leaf.panelIds.forEach((panelId, index) => {
            layout.push({
                moduleInstanceId: panelId,
                moduleName: getModuleName(panelId),
                relX: leaf.region.x,
                relY: leaf.region.y + (index / count) * leaf.region.height,
                relWidth: leaf.region.width,
                relHeight: leaf.region.height / count,
            });
        });
    }
    return layout;
}

export function layoutsAreEquivalent(a: LayoutElement[], b: LayoutElement[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    return a.every((elementA) => {
        const elementB = b.find((element) => element.moduleInstanceId === elementA.moduleInstanceId);
        if (!elementB) {
            return false;
        }
        return (
            Math.abs(elementA.relX - elementB.relX) < LAYOUT_EQUALITY_EPSILON &&
            Math.abs(elementA.relY - elementB.relY) < LAYOUT_EQUALITY_EPSILON &&
            Math.abs(elementA.relWidth - elementB.relWidth) < LAYOUT_EQUALITY_EPSILON &&
            Math.abs(elementA.relHeight - elementB.relHeight) < LAYOUT_EQUALITY_EPSILON
        );
    });
}
