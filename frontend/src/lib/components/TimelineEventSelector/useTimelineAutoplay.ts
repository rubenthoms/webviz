import React from "react";

import { sortEventsByTimestamp } from "./_utils";
import type { TimelineEvent } from "./types";

export type UseTimelineAutoplayOptions = {
    /** The full set of selectable events - same array you pass to `TimelineEventSelector`. */
    events: TimelineEvent[];
    /** Currently selected event id - same controlled value you pass to `TimelineEventSelector`. */
    selectedEventId: string | null;
    onSelectedEventChange: (eventId: string) => void;
    /** Delay between steps, in milliseconds. */
    delayMs: number;
    /** When the last event is reached, loop back to the first and keep playing instead of stopping. @default false */
    loop?: boolean;
};

export type UseTimelineAutoplayResult = {
    isPlaying: boolean;
    play: () => void;
    pause: () => void;
    toggle: () => void;
};

/**
 * Drives a `TimelineEventSelector`'s controlled selection forward one event at a time on a fixed
 * interval - e.g. wired to a play/pause button (see `TimelineAutoplayButton`) to "play through" a
 * dataset. Pure state/timer logic with no UI of its own, so it composes with any selection/button.
 */
export function useTimelineAutoplay(options: UseTimelineAutoplayOptions): UseTimelineAutoplayResult {
    const [isPlaying, setIsPlaying] = React.useState(false);

    const latestRef = React.useRef(options);
    latestRef.current = options;

    React.useEffect(
        function advanceOnInterval() {
            if (!isPlaying) return;

            const intervalId = setInterval(() => {
                const { events, selectedEventId, onSelectedEventChange, loop } = latestRef.current;
                const sortedEvents = sortEventsByTimestamp(events);
                if (sortedEvents.length === 0) return;

                const currentIndex = selectedEventId ? sortedEvents.findIndex((e) => e.id === selectedEventId) : -1;
                const nextIndex = currentIndex + 1;

                if (nextIndex >= sortedEvents.length) {
                    // Non-looping playback resets to the start rather than parking on the last event,
                    // so pressing play again always replays the whole sequence from the beginning.
                    onSelectedEventChange(sortedEvents[0].id);
                    if (!loop) setIsPlaying(false);
                    return;
                }

                onSelectedEventChange(sortedEvents[nextIndex].id);
            }, latestRef.current.delayMs);

            return () => clearInterval(intervalId);
        },
        [isPlaying, options.delayMs],
    );

    return {
        isPlaying,
        play: () => setIsPlaying(true),
        pause: () => setIsPlaying(false),
        toggle: () => setIsPlaying((playing) => !playing),
    };
}
