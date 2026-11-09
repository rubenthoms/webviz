import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import type { LayoutElement } from "@framework/internal/Dashboard";

import { DockviewModuleLayout, type ModuleDragHandlers } from "./dockviewModuleLayout";
import { endNewModuleDrag, startNewModuleDrag } from "./dragAndDrop";

const COLORS = ["#dbeafe", "#dcfce7", "#fef9c3", "#fce7f3", "#ede9fe", "#ffedd5", "#cffafe"];

function makeElement(id: string, relX: number, relY: number, relWidth: number, relHeight: number): LayoutElement {
    return { moduleInstanceId: id, moduleName: `Module ${id}`, relX, relY, relWidth, relHeight };
}

const TWO_SIDE_BY_SIDE: LayoutElement[] = [makeElement("A", 0, 0, 0.5, 1), makeElement("B", 0.5, 0, 0.5, 1)];

const NESTED: LayoutElement[] = [
    makeElement("A", 0, 0, 1, 0.5),
    makeElement("B", 0, 0.5, 0.5, 0.5),
    makeElement("C", 0.5, 0.5, 0.5, 0.25),
    makeElement("D", 0.5, 0.75, 0.5, 0.25),
];

type MockModuleProps = {
    id: string;
    isMaximized: boolean;
    dragHandlers: ModuleDragHandlers;
    onToggleMaximize: (id: string) => void;
    onRemove: (id: string) => void;
};

function MockModule(props: MockModuleProps): React.ReactNode {
    // Shows whether moving a module remounts its content, which would e.g. lose WebGL contexts
    const [mountedAt] = React.useState(() => new Date().toLocaleTimeString());
    const color = COLORS[props.id.charCodeAt(0) % COLORS.length];

    return (
        <div className="px-4xs py-4xs box-border h-full w-full" data-testid={`module-${props.id}`}>
            <div className="border-neutral-subtle bg-surface flex h-full w-full flex-col border">
                <div
                    data-module-header
                    className="px-xs py-4xs bg-neutral text-body-sm font-bolder gap-xs flex items-center"
                >
                    <div
                        className="grow cursor-move"
                        draggable
                        onDragStart={props.dragHandlers.onDragStart}
                        onDragEnd={props.dragHandlers.onDragEnd}
                    >
                        Module {props.id}
                    </div>
                    <button type="button" onClick={() => props.onToggleMaximize(props.id)}>
                        {props.isMaximized ? "Restore" : "Maximize"}
                    </button>
                    <button
                        type="button"
                        aria-label={`Remove module ${props.id}`}
                        onClick={() => props.onRemove(props.id)}
                    >
                        ✕
                    </button>
                </div>
                <div
                    className="text-body-sm flex grow flex-col items-center justify-center"
                    style={{ backgroundColor: color }}
                >
                    <span>Content of module {props.id}</span>
                    <span data-testid={`mounted-at-${props.id}`}>Mounted at {mountedAt}</span>
                </div>
            </div>
        </div>
    );
}

function MockModulesList(): React.ReactNode {
    return (
        <div className="border-neutral-subtle gap-xs p-xs flex w-48 shrink-0 flex-col border-r">
            <span className="text-body-sm font-bolder">Modules list</span>
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

type PlaygroundProps = {
    initialLayout: LayoutElement[];
    readOnly: boolean;
};

function Playground(props: PlaygroundProps): React.ReactNode {
    const [layout, setLayout] = React.useState<LayoutElement[]>(props.initialLayout);
    const [maximizedId, setMaximizedId] = React.useState<string | null>(null);
    const nextIdRef = React.useRef(0);

    const handleRemove = React.useCallback(function handleRemove(id: string) {
        setMaximizedId((prev) => (prev === id ? null : prev));
        setLayout((prev) => prev.filter((element) => element.moduleInstanceId !== id));
    }, []);

    const handleToggleMaximize = React.useCallback(function handleToggleMaximize(id: string) {
        setMaximizedId((prev) => (prev === id ? null : id));
    }, []);

    const handleNewModuleDrop = React.useCallback(function handleNewModuleDrop(moduleName: string) {
        nextIdRef.current += 1;
        return { moduleInstanceId: `${moduleName}-${nextIdRef.current}`, moduleName };
    }, []);

    const renderModule = React.useCallback(
        function renderModule(id: string, dragHandlers: ModuleDragHandlers) {
            return (
                <MockModule
                    id={id}
                    isMaximized={id === maximizedId}
                    dragHandlers={dragHandlers}
                    onToggleMaximize={handleToggleMaximize}
                    onRemove={handleRemove}
                />
            );
        },
        [maximizedId, handleToggleMaximize, handleRemove],
    );

    return (
        <div className="flex h-[640px] w-full flex-col">
            <div className="flex min-h-0 grow">
                <MockModulesList />
                <div className="relative min-w-0 grow" data-testid="module-layout">
                    <DockviewModuleLayout
                        layout={layout}
                        onLayoutChange={setLayout}
                        renderModule={renderModule}
                        onNewModuleDrop={handleNewModuleDrop}
                        maximizedModuleInstanceId={maximizedId}
                        readOnly={props.readOnly}
                        emptyContent={
                            <div className="text-neutral-subtle absolute inset-0 flex items-center justify-center">
                                Drag modules here from the modules list
                            </div>
                        }
                    />
                </div>
            </div>
            <pre
                className="text-body-xs border-neutral-subtle p-xs max-h-40 shrink-0 overflow-auto border-t"
                data-testid="layout-json"
            >
                {JSON.stringify(
                    layout.map((el) => ({
                        id: el.moduleInstanceId,
                        x: +el.relX.toFixed(3),
                        y: +el.relY.toFixed(3),
                        w: +el.relWidth.toFixed(3),
                        h: +el.relHeight.toFixed(3),
                    })),
                )}
            </pre>
        </div>
    );
}

const meta: Meta<typeof Playground> = {
    title: "Framework/DockviewModuleLayout",
    component: Playground,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component: `
Spike: the module layout built on [dockview](https://dockview.dev). Modules are single-panel groups without tab
headers; the module header's title is the drag handle. Drop on a module's edge to split only that module, on the
layout's outer edge to dock along a whole side, or drag a sash to resize. Drag items from the mock modules list to
add modules. The persisted (flat) layout is shown below.
`,
            },
        },
    },
    args: {
        initialLayout: TWO_SIDE_BY_SIDE,
        readOnly: false,
    },
};

export default meta;

type Story = StoryObj<typeof Playground>;

export const TwoSideBySide: Story = {};

export const Nested: Story = {
    args: { initialLayout: NESTED },
};

export const Empty: Story = {
    args: { initialLayout: [] },
};

export const ReadOnly: Story = {
    args: { initialLayout: NESTED, readOnly: true },
};
