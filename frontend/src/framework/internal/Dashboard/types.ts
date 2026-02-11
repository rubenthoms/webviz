import type { SerializedModuleInstanceState } from "@framework/ModuleInstance.schema";

import type { LayoutElement } from "./Dashboard";

export type LayoutPatch = {
    removed: Record<string, { layoutBefore: LayoutElement; moduleState: SerializedModuleInstanceState }>;
    added: Record<string, { layoutAfter: LayoutElement; moduleState?: SerializedModuleInstanceState }>;
    updated: Record<string, { layoutBefore: LayoutElement; layoutAfter: LayoutElement }>;
};

export type DashboardLayoutHistoryState = {
    layout: LayoutElement[];

    moduleInstanceStatesById: Record<string, SerializedModuleInstanceState>;
};

export type DashboardActiveModuleHistoryState = {
    activeModuleInstanceId: string | null;
};
