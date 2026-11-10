import React from "react";

import { FilterAlt, History, Link, Palette, Settings, WebAsset } from "@mui/icons-material";
import type { Meta, StoryObj } from "@storybook/react";

import type { LayoutElement } from "@framework/internal/Dashboard";

import { DockviewModuleLayout, type ModuleDragHandlers } from "../Content/private-components/dockviewLayout/dockviewModuleLayout";
import { endNewModuleDrag, startNewModuleDrag } from "../Content/private-components/dockviewLayout/dragAndDrop";

import { SettingsDock } from "./settingsDock";
import type { SettingsDockPanel } from "./settingsDockContext";
import { SettingsDockController } from "./SettingsDockController";

function MockPanel(props: { name: string }): React.ReactNode {
    // Shows whether moving, floating or collapsing a panel remounts its content
    const [mountedAt] = React.useState(() => new Date().toLocaleTimeString());
    return (
        <div className="gap-y-xs p-xs text-body-sm flex flex-col" data-testid={`panel-content-${props.name}`}>
            <span className="font-bolder">{props.name}</span>
            <label className="gap-y-4xs flex flex-col">
                Some setting
                <input className="border-neutral-subtle px-3xs border" placeholder="Type to check state is kept" />
            </label>
            <span data-testid={`panel-mounted-at-${props.name}`}>Mounted at {mountedAt}</span>
        </div>
    );
}

function MockModulesList(): React.ReactNode {
    return (
        <div className="gap-xs p-xs flex flex-col">
            {["Map", "Plot", "Table"].map((name) => (
                <div
                    key={name}
                    data-testid={`new-module-${name}`}
                    className="border-neutral-subtle hover:bg-accent p-xs text-body-sm cursor-grab border select-none"
                    draggable
                    onDragStart={(e) => startNewModuleDrag(e, name)}
                    onDragEnd={endNewModuleDrag}
                >
                    {name}
                </div>
            ))}
        </div>
    );
}

const INITIAL_MODULES: LayoutElement[] = [
    { moduleInstanceId: "A", moduleName: "Module A", relX: 0, relY: 0, relWidth: 0.5, relHeight: 1 },
    { moduleInstanceId: "B", moduleName: "Module B", relX: 0.5, relY: 0, relWidth: 0.5, relHeight: 1 },
];

function MockModuleLayout(): React.ReactNode {
    const [layout, setLayout] = React.useState<LayoutElement[]>(INITIAL_MODULES);
    const nextIdRef = React.useRef(0);

    const handleNewModuleDrop = React.useCallback(function handleNewModuleDrop(moduleName: string) {
        nextIdRef.current += 1;
        return { moduleInstanceId: `${moduleName}-${nextIdRef.current}`, moduleName };
    }, []);

    const renderModule = React.useCallback(function renderModule(id: string, dragHandlers: ModuleDragHandlers) {
        return (
            <div className="px-4xs py-4xs box-border h-full w-full" data-testid={`module-${id}`}>
                <div className="border-neutral-subtle bg-surface flex h-full w-full flex-col border">
                    <div
                        data-module-header
                        className="px-xs py-4xs bg-neutral text-body-sm font-bolder cursor-move"
                        draggable
                        onDragStart={dragHandlers.onDragStart}
                        onDragEnd={dragHandlers.onDragEnd}
                    >
                        Module {id}
                    </div>
                    <div className="text-body-sm flex grow items-center justify-center bg-[#dbeafe]">Content {id}</div>
                </div>
            </div>
        );
    }, []);

    return (
        <div className="relative h-full w-full" data-testid="module-layout">
            <DockviewModuleLayout
                layout={layout}
                onLayoutChange={setLayout}
                renderModule={renderModule}
                onNewModuleDrop={handleNewModuleDrop}
                maximizedModuleInstanceId={null}
                readOnly={false}
            />
        </div>
    );
}

type PlaygroundProps = {
    persist: boolean;
};

function Playground(props: PlaygroundProps): React.ReactNode {
    const [controller] = React.useState(() => new SettingsDockController());
    const center = React.useMemo(() => <MockModuleLayout />, []);

    const panels = React.useMemo<SettingsDockPanel[]>(
        () => [
            {
                id: "module-settings",
                title: "Module settings",
                icon: <Settings fontSize="inherit" />,
                defaultEdge: "left",
                initiallyOpen: true,
                content: <MockPanel name="Module settings" />,
            },
            {
                id: "sync-settings",
                title: "Sync settings",
                icon: <Link fontSize="inherit" />,
                defaultEdge: "left",
                initiallyOpen: true,
                content: <MockPanel name="Sync settings" />,
            },
            {
                id: "modules-list",
                title: "Modules",
                icon: <WebAsset fontSize="inherit" />,
                defaultEdge: "right",
                content: <MockModulesList />,
                railTestId: "modules-list-open-button",
            },
            {
                id: "realization-filter",
                title: "Realization filter",
                icon: <FilterAlt fontSize="inherit" />,
                defaultEdge: "right",
                content: <MockPanel name="Realization filter" />,
            },
            {
                id: "module-log",
                title: "Module log",
                icon: <History fontSize="inherit" />,
                defaultEdge: "right",
                content: <MockPanel name="Module log" />,
            },
            {
                id: "color-palettes",
                title: "Color palettes",
                icon: <Palette fontSize="inherit" />,
                defaultEdge: "right",
                content: <MockPanel name="Color palettes" />,
            },
        ],
        [],
    );

    return (
        <div className="h-[720px] w-full">
            <SettingsDock
                center={center}
                panels={panels}
                controller={controller}
                storageKey={props.persist ? "webviz.storybook.settingsDock" : undefined}
            />
        </div>
    );
}

const meta: Meta<typeof Playground> = {
    title: "Framework/SettingsDock",
    component: Playground,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component: `
Spike: settings panels docked around the module layout. Drag a tab onto another group to combine them as tabs, onto
a group's edge to place it next to/below that group, onto the module layout's edge to dock it beside the modules, or
onto the outer border to start a new column/row. Each side has a rail with an icon per panel that belongs there:
toggled on while shown, click to hide or show it (it returns exactly where it was). The double chevron collapses a
side: its panels then open floating over the modules until the side is expanded again. Float a panel with the header
button, the tab's context menu or shift-dragging its tab.
`,
            },
        },
    },
    args: { persist: false },
    // The app renders in StrictMode, which mounts effects twice in development; the dock must survive that
    decorators: [
        (Story) => (
            <React.StrictMode>
                <Story />
            </React.StrictMode>
        ),
    ],
};

export default meta;

type Story = StoryObj<typeof Playground>;

export const Default: Story = {};

export const Persisted: Story = {
    args: { persist: true },
};
