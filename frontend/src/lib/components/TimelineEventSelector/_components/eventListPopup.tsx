import type React from "react";

import { Popover } from "@lib/components/Popover";
import { formatDate } from "@lib/utils/dates";

import type { TimelineEvent } from "../types";

export type EventListPopupProps = {
    events: TimelineEvent[];
    onSelectEvent: (eventId: string) => void;
};

export function EventListPopup(props: EventListPopupProps): React.ReactNode {
    return (
        <Popover.Content as="div" layoutClassName="max-h-60 w-56 overflow-y-auto">
            <ul className="flex flex-col">
                {props.events.map((event) => (
                    <li key={event.id}>
                        <button
                            type="button"
                            className="hover:bg-neutral-hover px-2xs py-4xs text-body-sm w-full rounded text-left"
                            onClick={() => props.onSelectEvent(event.id)}
                        >
                            <span className="block truncate">{event.label}</span>
                            <span className="text-neutral-subtle text-body-xs block">{formatDate(event.timestamp)}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </Popover.Content>
    );
}
