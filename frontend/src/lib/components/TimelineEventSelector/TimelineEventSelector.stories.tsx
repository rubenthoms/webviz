import React from "react";

import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../Button";

import type { TimeViewport, TimelineEvent } from "./types";

import { TimelineEventSelector } from "./index";

const BASE_DATE = new Date("2026-01-01T00:00:00Z");

function offsetDate(days: number, hours = 0, minutes = 0): Date {
    return new Date(BASE_DATE.getTime() + days * 86_400_000 + hours * 3_600_000 + minutes * 60_000);
}

let idCounter = 0;
function makeEvent(timestamp: Date, label: string): TimelineEvent {
    idCounter += 1;
    return { id: `evt-${idCounter}`, timestamp, label };
}

function buildMixedDataset(): TimelineEvent[] {
    const events: TimelineEvent[] = [
        makeEvent(offsetDate(0), "Kickoff"),
        makeEvent(offsetDate(18), "Site survey"),
        makeEvent(offsetDate(45), "Permit approved"),
        makeEvent(offsetDate(95), "Phase 1 complete"),
    ];

    for (let i = 0; i < 6; i++) {
        events.push(makeEvent(offsetDate(60, i * 0.7), `Inspection ${i + 1}`));
    }
    for (let i = 0; i < 8; i++) {
        events.push(makeEvent(offsetDate(130, i * 0.4), `Test run ${i + 1}`));
    }
    for (let i = 0; i < 220; i++) {
        events.push(makeEvent(offsetDate(170, 0, i * 0.4), `Sensor reading ${i + 1}`));
    }

    events.push(makeEvent(offsetDate(180), "Final review"));

    return events;
}

function buildSingleEventDataset(): TimelineEvent[] {
    return [makeEvent(offsetDate(30), "Only event")];
}

function buildIdenticalTimestampDataset(): TimelineEvent[] {
    const timestamp = offsetDate(30);
    return Array.from({ length: 5 }, (_, i) => makeEvent(timestamp, `Simultaneous event ${i + 1}`));
}

function buildSparseDataset(): TimelineEvent[] {
    return [
        makeEvent(offsetDate(0), "Event A"),
        makeEvent(offsetDate(3), "Event B"),
        makeEvent(offsetDate(4), "Event C"),
        makeEvent(offsetDate(90), "Event D"),
        makeEvent(offsetDate(91), "Event E"),
        makeEvent(offsetDate(240), "Event F"),
    ];
}

const mixedDatasetEvents = buildMixedDataset();
const singleEventDataset = buildSingleEventDataset();
const identicalTimestampDataset = buildIdenticalTimestampDataset();
const sparseDataset = buildSparseDataset();

const meta: Meta<typeof TimelineEventSelector> = {
    title: "Components/TimelineEventSelector",
    component: TimelineEventSelector,
    parameters: {
        layout: "centered",
        docs: {
            description: {
                component: `
A two-ribbon timeline for selecting one event out of a set of temporally-clustered, unevenly
distributed discrete events. An always-visible overview ribbon provides context and navigation;
a detail ribbon auto-focuses on a sensible local neighbourhood of events for precise selection,
zoom, and pan (mouse wheel, ctrl+wheel/pinch, drag, and previous/next navigation).
                `,
            },
        },
    },
    decorators: [
        // Note: this project's Tailwind width utilities only cover numeric pixel sizes (w-4..w-96,
        // see sizing.css) - there's no "w-4xl"-style named width scale, so a fixed inline width is
        // used here instead of a utility class that would silently resolve to nothing.
        (Story) => (
            <div style={{ width: "56rem" }}>
                <Story />
            </div>
        ),
    ],
    tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TimelineEventSelector>;

export const Default: Story = {
    args: {
        events: mixedDatasetEvents,
    },
};

export const DenseCluster: Story = {
    args: {
        events: mixedDatasetEvents,
        defaultSelectedEventId: mixedDatasetEvents.find((e) => e.label === "Sensor reading 1")?.id,
    },
};

export const SingleEvent: Story = {
    args: {
        events: singleEventDataset,
        defaultSelectedEventId: singleEventDataset[0].id,
    },
};

export const IdenticalTimestamps: Story = {
    args: {
        events: identicalTimestampDataset,
        defaultSelectedEventId: identicalTimestampDataset[0].id,
    },
};

export const SparseEvents: Story = {
    args: {
        events: sparseDataset,
    },
};

export const ControlledSelection: Story = {
    render: function ControlledSelectionStory() {
        const [selectedEventId, setSelectedEventId] = React.useState<string | null>(mixedDatasetEvents[0].id);

        return (
            <div className="gap-sm flex flex-col">
                <div className="gap-xs flex flex-wrap">
                    {mixedDatasetEvents.slice(0, 4).map((event) => (
                        <Button key={event.id} size="small" variant="outlined" onClick={() => setSelectedEventId(event.id)}>
                            {event.label}
                        </Button>
                    ))}
                </div>
                <TimelineEventSelector
                    events={mixedDatasetEvents}
                    selectedEventId={selectedEventId}
                    onSelectedEventChange={(id) => setSelectedEventId(id)}
                />
            </div>
        );
    },
};

export const ControlledViewport: Story = {
    render: function ControlledViewportStory() {
        const [viewport, setViewport] = React.useState<TimeViewport>({
            start: mixedDatasetEvents[0].timestamp,
            end: mixedDatasetEvents[3].timestamp,
        });

        return <TimelineEventSelector events={mixedDatasetEvents} viewport={viewport} onViewportChange={(vp) => setViewport(vp)} />;
    },
};

export const Disabled: Story = {
    args: {
        events: mixedDatasetEvents,
        defaultSelectedEventId: mixedDatasetEvents[0].id,
        disabled: true,
    },
};
