import type { Workbench } from "@framework/Workbench";

import { DashboardsPanel } from "./_panels/dashboards/dashboardsPanel";

export type BottomBarProps = {
    workbench: Workbench;
};

export function BottomBar(props: BottomBarProps) {
    return (
        <div className="border-t-neutral-subtle bg-surface/30 shadow-elevation-raised gap-x-sm flex items-center border-t-2">
            <DashboardsPanel workbench={props.workbench} />
        </div>
    );
}
