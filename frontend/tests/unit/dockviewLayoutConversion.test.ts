import { Orientation } from "dockview-react";
import { describe, expect, it } from "vitest";

import {
    dockviewToFlatLayout,
    flatLayoutToDockview,
    layoutsAreEquivalent,
} from "../../src/framework/internal/components/Content/private-components/dockviewLayout/layoutConversion";
import type { LayoutElement } from "../../src/framework/internal/Dashboard";

function element(id: string, relX: number, relY: number, relWidth: number, relHeight: number): LayoutElement {
    return { moduleInstanceId: id, moduleName: `module-${id}`, relX, relY, relWidth, relHeight };
}

function roundTrip(layout: LayoutElement[], size = { width: 1200, height: 800 }): LayoutElement[] {
    const serialized = flatLayoutToDockview(layout, size);
    if (!serialized) {
        return [];
    }
    return dockviewToFlatLayout(serialized, (id) => `module-${id}`);
}

const LAYOUTS: Record<string, LayoutElement[]> = {
    single: [element("a", 0, 0, 1, 1)],
    twoColumns: [element("a", 0, 0, 0.5, 1), element("b", 0.5, 0, 0.5, 1)],
    threeRows: [element("a", 0, 0, 1, 1 / 3), element("b", 0, 1 / 3, 1, 1 / 3), element("c", 0, 2 / 3, 1, 1 / 3)],
    grid2x2: [
        element("a", 0, 0, 0.5, 0.5),
        element("b", 0.5, 0, 0.5, 0.5),
        element("c", 0, 0.5, 0.5, 0.5),
        element("d", 0.5, 0.5, 0.5, 0.5),
    ],
    columnsOf2x2: [
        element("a", 0, 0, 0.5, 0.5),
        element("c", 0, 0.5, 0.5, 0.5),
        element("b", 0.5, 0, 0.5, 0.5),
        element("d", 0.5, 0.5, 0.5, 0.5),
    ],
    unevenNested: [
        element("a", 0, 0, 1, 0.5),
        element("b", 0, 0.5, 0.5, 0.5),
        element("c", 0.5, 0.5, 0.25, 0.5),
        element("d", 0.75, 0.5, 0.25, 0.25),
        element("e", 0.75, 0.75, 0.25, 0.25),
    ],
    float32Values: [element("a", 0, 0, 0.33333334, 1), element("b", 0.33333334, 0, 0.6666666, 1)],
};

describe("dockview layout conversion", () => {
    it.each(Object.entries(LAYOUTS))("round-trips the %s layout", (_, layout) => {
        expect(layoutsAreEquivalent(roundTrip(layout), layout)).toBe(true);
    });

    it("does not depend on the container size", () => {
        const layout = LAYOUTS.unevenNested;
        expect(layoutsAreEquivalent(roundTrip(layout, { width: 0, height: 0 }), layout)).toBe(true);
        expect(layoutsAreEquivalent(roundTrip(layout, { width: 333, height: 2000 }), layout)).toBe(true);
    });

    it("alternates branch orientations, as required by dockview", () => {
        const serialized = flatLayoutToDockview(LAYOUTS.unevenNested, { width: 1000, height: 1000 });
        expect(serialized?.grid.orientation).toBe(Orientation.VERTICAL);

        const root = serialized?.grid.root;
        expect(root?.type).toBe("branch");
        // Top row is a leaf; bottom row is a horizontal branch whose last column is a vertical branch
        const rows = root?.data as { type: string; data: unknown }[];
        expect(rows.map((row) => row.type)).toEqual(["leaf", "branch"]);
        const bottomColumns = rows[1].data as { type: string }[];
        expect(bottomColumns.map((column) => column.type)).toEqual(["leaf", "leaf", "branch"]);
    });

    it("hides the tab header of every group and renders panels persistently", () => {
        const serialized = flatLayoutToDockview(LAYOUTS.grid2x2, { width: 1000, height: 1000 });
        expect(Object.values(serialized?.panels ?? {}).every((panel) => panel.renderer === "always")).toBe(true);

        const groups: { hideHeader?: boolean; views: string[] }[] = [];
        function collect(node: { type: string; data: unknown }) {
            if (node.type === "leaf") {
                groups.push(node.data as { hideHeader?: boolean; views: string[] });
                return;
            }
            (node.data as { type: string; data: unknown }[]).forEach(collect);
        }
        collect(serialized!.grid.root);
        expect(groups).toHaveLength(4);
        expect(groups.every((group) => group.hideHeader === true && group.views.length === 1)).toBe(true);
    });

    it("falls back to stacking non-guillotine layouts instead of failing", () => {
        // Pinwheel: no straight cut separates the elements
        const pinwheel = [
            element("a", 0, 0, 2 / 3, 1 / 3),
            element("b", 2 / 3, 0, 1 / 3, 2 / 3),
            element("c", 1 / 3, 2 / 3, 2 / 3, 1 / 3),
            element("d", 0, 1 / 3, 1 / 3, 2 / 3),
            element("e", 1 / 3, 1 / 3, 1 / 3, 1 / 3),
        ];
        const result = roundTrip(pinwheel);
        expect(result.map((el) => el.moduleInstanceId).sort()).toEqual(["a", "b", "c", "d", "e"]);
        const totalArea = result.reduce((sum, el) => sum + el.relWidth * el.relHeight, 0);
        expect(totalArea).toBeCloseTo(1);
    });

    it("returns null for an empty layout", () => {
        expect(flatLayoutToDockview([], { width: 100, height: 100 })).toBeNull();
    });

    it("round-trips the layouts of all built-in templates", async () => {
        await import("../../src/templates/registerAllTemplates");
        const { TemplateRegistry } = await import("../../src/framework/TemplateRegistry");
        const templates = TemplateRegistry.getRegisteredTemplates();
        expect(templates.length).toBeGreaterThan(0);

        for (const template of templates) {
            const layout = template.moduleInstances.map((instance) => ({
                ...instance.layout,
                moduleInstanceId: instance.id,
                moduleName: `module-${instance.id}`,
            }));
            expect(layoutsAreEquivalent(roundTrip(layout), layout), template.name).toBe(true);
        }
    });

    it("compares layouts with a tolerance and by module instance", () => {
        const layout = LAYOUTS.twoColumns;
        const shifted = layout.map((el) => ({ ...el, relWidth: el.relWidth + 1e-5 }));
        expect(layoutsAreEquivalent(layout, [...shifted].reverse())).toBe(true);
        expect(layoutsAreEquivalent(layout, [layout[0], { ...layout[1], relX: 0.6 }])).toBe(false);
        expect(layoutsAreEquivalent(layout, [layout[0]])).toBe(false);
    });
});
