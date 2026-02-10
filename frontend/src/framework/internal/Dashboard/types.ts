import type { LayoutElement } from "./Dashboard";

export type DashboardLayoutHistoryState = {
    layout: LayoutElement[];
};

export type DashboardActiveModuleHistoryState = {
    activeModuleInstanceId: string | null;
};
