import React from "react";

import { v4 } from "uuid";

import { useStableProp } from "@lib/hooks/useStableProp";
import { usePublishSubscribeTopicValue } from "@lib/utils/PublishSubscribeDelegate";

import type { ElevatedSettingConstraintMode, ElevatedSettingDefinition } from "../ElevatedSettingDefinition";
import {
    ElevatedSettingInstanceTopic,
    type ElevatedSettingConstraintSourceHandle,
    type ElevatedSettingInstance,
    type ElevatedSettingInstanceTopicPayloads,
} from "../ElevatedSettingInstance";
import { ElevatedSettingsServiceTopic, type ElevatedSettingsService } from "../ElevatedSettingsService";

const NO_SUBSCRIPTION = () => () => {};
const NO_SNAPSHOT = () => undefined;

export function useElevatedSettingInstances(
    elevatedSettingsService: ElevatedSettingsService,
): readonly ElevatedSettingInstance<any, any>[] {
    return usePublishSubscribeTopicValue(elevatedSettingsService, ElevatedSettingsServiceTopic.ACTIVE_SETTINGS);
}

// The instance of `definition`, or null while the setting isn't elevated on the dashboard.
export function useElevatedSetting<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): ElevatedSettingInstance<TValue, TConstraints> | null {
    useElevatedSettingInstances(elevatedSettingsService);
    return elevatedSettingsService.getSetting(definition);
}

// Subscribes to a topic of an instance that may not exist (yet) - undefined while it doesn't.
export function useElevatedSettingInstanceTopic<
    TValue,
    TConstraints,
    TTopic extends ElevatedSettingInstanceTopic,
>(
    instance: ElevatedSettingInstance<TValue, TConstraints> | null,
    topic: TTopic,
): ElevatedSettingInstanceTopicPayloads<TValue, TConstraints>[TTopic] | undefined {
    const subscribe = React.useMemo(
        () => (instance ? instance.getPublishSubscribeDelegate().makeSubscriberFunction(topic) : NO_SUBSCRIPTION),
        [instance, topic],
    );
    const getSnapshot = React.useMemo(
        () => (instance ? instance.makeSnapshotGetter(topic) : NO_SNAPSHOT),
        [instance, topic],
    );

    return React.useSyncExternalStore(subscribe, getSnapshot);
}

// The elevated value, or undefined while the setting isn't elevated on the dashboard.
export function useElevatedSettingValue<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): TValue | undefined {
    const instance = useElevatedSetting(elevatedSettingsService, definition);
    return useElevatedSettingInstanceTopic(instance, ElevatedSettingInstanceTopic.VALUE);
}

export function useElevatedSettingConstraints<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): TConstraints | undefined {
    const instance = useElevatedSetting(elevatedSettingsService, definition);
    return useElevatedSettingInstanceTopic(instance, ElevatedSettingInstanceTopic.CONSTRAINTS);
}

export type UseElevatedSettingConsumerOptions = {
    mode?: ElevatedSettingConstraintMode;
    // While true, the consumer is marked as pending - its options are being recomputed - and the
    // `constraints` passed in are not contributed.
    isLoading?: boolean;
};

export type ElevatedSettingConsumerResult<TValue> = {
    isElevated: boolean;
    // The elevated value - undefined while the setting isn't elevated, in which case the consumer
    // should fall back to its own local value.
    value: TValue | undefined;
};

/**
 * Makes a component a consumer of an elevated setting: while the setting is elevated, `constraints`
 * (the options this consumer can offer) are contributed to it, and the elevated value is returned.
 * Pass `null` as `constraints` when the consumer has no opinion. Constraints are deep-compared, so a new
 * array on every render is fine.
 */
export function useElevatedSettingConsumer<TValue, TConstraints>(
    elevatedSettingsService: ElevatedSettingsService,
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
    constraints: TConstraints | null,
    options?: UseElevatedSettingConsumerOptions,
): ElevatedSettingConsumerResult<TValue> {
    const instance = useElevatedSetting(elevatedSettingsService, definition);
    const value = useElevatedSettingInstanceTopic(instance, ElevatedSettingInstanceTopic.VALUE);

    const [sourceId] = React.useState(() => v4());
    const [stableConstraints] = useStableProp(constraints);
    const handleRef = React.useRef<ElevatedSettingConstraintSourceHandle<TConstraints> | null>(null);

    const mode = options?.mode;
    const isLoading = options?.isLoading ?? false;

    React.useEffect(
        function registerConstraintSourceEffect() {
            if (!instance) {
                return;
            }

            const handle = instance.registerConstraintSource(sourceId, { mode });
            handleRef.current = handle;

            return function unregisterConstraintSource() {
                handle.unregister();
                handleRef.current = null;
            };
        },
        [instance, sourceId, mode],
    );

    // Declared after the registration effect, so it runs after it within the same commit.
    React.useEffect(
        function contributeConstraintsEffect() {
            const handle = handleRef.current;
            if (!handle) {
                return;
            }

            if (isLoading) {
                handle.markPending();
            } else if (stableConstraints === null) {
                handle.clearConstraints();
            } else {
                handle.updateConstraints(stableConstraints);
            }
        },
        [instance, mode, stableConstraints, isLoading],
    );

    return { isElevated: instance !== null, value };
}
