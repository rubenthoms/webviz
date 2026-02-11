import type { Dashboard, LayoutElement } from "./Dashboard";
import type { RemovedModuleCache } from "./DashboardUndoRedoGenerator";
import type { LayoutPatch } from "./types";

export function cloneLayoutElement(el: LayoutElement): LayoutElement {
    return {
        moduleInstanceId: el.moduleInstanceId,
        moduleName: el.moduleName,
        relX: el.relX,
        relY: el.relY,
        relWidth: el.relWidth,
        relHeight: el.relHeight,
        minimized: el.minimized ?? false,
        maximized: el.maximized ?? false,
    };
}

export function sameLayoutEl(a: LayoutElement, b: LayoutElement): boolean {
    return (
        a.moduleInstanceId === b.moduleInstanceId &&
        a.moduleName === b.moduleName &&
        a.relX === b.relX &&
        a.relY === b.relY &&
        a.relWidth === b.relWidth &&
        a.relHeight === b.relHeight &&
        (a.minimized ?? false) === (b.minimized ?? false) &&
        (a.maximized ?? false) === (b.maximized ?? false)
    );
}

function layoutToMap(layout: LayoutElement[]): Map<string, LayoutElement> {
    const m = new Map<string, LayoutElement>();
    for (const el of layout) {
        if (!el.moduleInstanceId) continue;
        m.set(el.moduleInstanceId, el);
    }
    return m;
}

export function diffLayout(
    beforeLayout: LayoutElement[],
    afterLayout: LayoutElement[],
    dashboard: Dashboard,
    removedCache?: RemovedModuleCache,
): LayoutPatch {
    const beforeMap = layoutToMap(beforeLayout);
    const afterMap = layoutToMap(afterLayout);

    const beforeIds = new Set(beforeMap.keys());
    const afterIds = new Set(afterMap.keys());

    const removed: LayoutPatch["removed"] = {};
    const added: LayoutPatch["added"] = {};
    const updated: LayoutPatch["updated"] = {};

    // removed
    for (const id of beforeIds) {
        if (afterIds.has(id)) continue;

        // 1) Prefer cache (captured pre-unload)
        const cached = removedCache?.get(id);
        if (cached) {
            removed[id] = {
                moduleState: cached.moduleState,
                layoutBefore: cloneLayoutElement(cached.layoutBefore),
            };
            continue;
        }

        // 2) Fallback: still present in dashboard (if removal not yet unloaded)
        const layoutBefore = beforeMap.get(id);
        const mi = dashboard.getModuleInstance(id);
        if (mi && layoutBefore) {
            removed[id] = {
                moduleState: mi.serializeState(),
                layoutBefore: cloneLayoutElement(layoutBefore),
            };
            continue;
        }

        // 3) Hard fail: cannot resurrect on undo
        throw new Error(
            `diffLayout: module instance '${id}' missing when capturing removed module state. ` +
                `Make sure generator caches removed module state in MODULE_INSTANCE_WILL_REMOVE before unload.`,
        );
    }

    // added
    for (const id of afterIds) {
        if (beforeIds.has(id)) continue;

        const layoutAfter = afterMap.get(id);
        if (!layoutAfter) continue;

        added[id] = { layoutAfter: cloneLayoutElement(layoutAfter) };
    }

    // updated (common ids)
    for (const id of beforeIds) {
        if (!afterIds.has(id)) continue;

        const b = beforeMap.get(id)!;
        const a = afterMap.get(id)!;

        if (!sameLayoutEl(b, a)) {
            updated[id] = { layoutBefore: cloneLayoutElement(b), layoutAfter: cloneLayoutElement(a) };
        }
    }

    return {
        removed,
        added,
        updated,
    };
}

export function invertLayoutPatch(patch: LayoutPatch): LayoutPatch {
    const removed: LayoutPatch["removed"] = {};
    const added: LayoutPatch["added"] = {};
    const updated: LayoutPatch["updated"] = {};

    // Inverse of "removed" is "added" with layoutAfter = layoutBefore + moduleState
    for (const [id, info] of Object.entries(patch.removed)) {
        added[id] = {
            layoutAfter: cloneLayoutElement(info.layoutBefore),
            moduleState: info.moduleState,
        };
    }

    // Inverse of "added" is "removed". If moduleState was not captured for added, undoing "added" does not require it.
    // For redo correctness after undo, you might want it, but removal doesn't need it.
    for (const [id, info] of Object.entries(patch.added)) {
        // We need a layoutBefore for removed. We only have layoutAfter from the add-patch.
        // That is fine: when undoing an "add", we are removing it, and if later re-adding via redo,
        // we'll use the forward patch's added info again.
        removed[id] = {
            moduleState: info.moduleState as any, // may be undefined; not required for removing
            layoutBefore: cloneLayoutElement(info.layoutAfter),
        };
    }

    // swap updated
    for (const [id, info] of Object.entries(patch.updated)) {
        updated[id] = {
            layoutBefore: cloneLayoutElement(info.layoutAfter),
            layoutAfter: cloneLayoutElement(info.layoutBefore),
        };
    }

    return {
        removed,
        added,
        updated,
    };
}

export function upsertLayoutElement(dashboard: Dashboard, el: LayoutElement): void {
    const id = el.moduleInstanceId;
    if (!id) return;

    const idx = dashboard.getLayout().findIndex((x) => x.moduleInstanceId === id);
    const cloned = cloneLayoutElement(el);

    if (idx === -1) {
        // dashboard.getLayout() returns reference, but you usually manage _layout internally.
        // Prefer an internal method that mutates _layout directly. If not, do:
        dashboard.setLayout([...dashboard.getLayout(), cloned]);
    } else {
        const next = [...dashboard.getLayout()];
        next[idx] = cloned;
        dashboard.setLayout(next);
    }
}

export function upsertLayoutInArray(arr: LayoutElement[], el: LayoutElement): LayoutElement[] {
    const id = el.moduleInstanceId;
    if (!id) return arr;

    const idx = arr.findIndex((x) => x.moduleInstanceId === id);
    if (idx === -1) return [...arr, el];

    const next = [...arr];
    next[idx] = el;
    return next;
}

export function composeLayoutPatches(a: LayoutPatch, b: LayoutPatch): LayoutPatch {
    // applying a then b => combined
    const removed: LayoutPatch["removed"] = { ...a.removed };
    const added: LayoutPatch["added"] = { ...a.added };
    const updated: LayoutPatch["updated"] = { ...a.updated };

    // First handle b.removed
    for (const [id, info] of Object.entries(b.removed)) {
        // If it was added in a, and removed in b => net effect: nothing
        if (added[id]) {
            delete added[id];
            // if also updated, drop it
            delete updated[id];
            continue;
        }

        // If it existed already, keep earliest moduleState/layoutBefore (from a if present)
        if (!removed[id]) removed[id] = info;
        // once removed, no need to track updated
        delete updated[id];
    }

    // Handle b.added
    for (const [id, info] of Object.entries(b.added)) {
        // If it was removed in a then added in b => net effect could be "updated" from original before to new after
        // But easiest: remove from removed, keep as added with info.
        if (removed[id]) {
            delete removed[id];
        }
        added[id] = info;
        // and any updated becomes irrelevant; the added’s layoutAfter is the truth
        delete updated[id];
    }

    // Handle b.updated
    for (const [id, info] of Object.entries(b.updated)) {
        // ignore if removed
        if (removed[id]) continue;

        // if added, just update its layoutAfter
        if (added[id]) {
            added[id] = { ...added[id], layoutAfter: info.layoutAfter };
            continue;
        }

        // already updated in a? keep earliest before, latest after
        const prev = updated[id];
        if (prev) {
            updated[id] = { layoutBefore: prev.layoutBefore, layoutAfter: info.layoutAfter };
        } else {
            updated[id] = info;
        }
    }

    return {
        removed,
        added,
        updated,
    };
}

export function isEmptyPatch(patch: LayoutPatch): boolean {
    return (
        Object.keys(patch.added).length === 0 &&
        Object.keys(patch.removed).length === 0 &&
        Object.keys(patch.updated).length === 0
    );
}
