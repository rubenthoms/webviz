import { PublishSubscribeDelegate, type PublishSubscribe } from "@lib/utils/PublishSubscribeDelegate";

import type { ElevatedSettingDefinition } from "./ElevatedSettingDefinition";
import {
    ElevatedSettingInstance,
    ElevatedSettingInstanceTopic,
    ElevatedSettingValueSource,
} from "./ElevatedSettingInstance";
import { ElevatedSettingRegistry } from "./ElevatedSettingRegistry";
import type { SerializedElevatedSettingsState } from "./ElevatedSettingsService.schema";

export enum ElevatedSettingsServiceTopic {
    ACTIVE_SETTINGS = "ACTIVE_SETTINGS",
    // Bumped whenever something that is persisted changes (settings added/removed, values changed).
    STATE_REVISION = "STATE_REVISION",
}

export type ElevatedSettingsServiceTopicPayloads = {
    [ElevatedSettingsServiceTopic.ACTIVE_SETTINGS]: readonly ElevatedSettingInstance<any, any>[];
    [ElevatedSettingsServiceTopic.STATE_REVISION]: number;
};

export type AddElevatedSettingOptions<TValue, TConstraints> = {
    // An explicit initial value, e.g. from a template. Treated like a restored value: kept (and flagged)
    // if it doesn't fit the current context, instead of being fixed up.
    value?: TValue;
    constraintOverride?: TConstraints;
};

export class ElevatedSettingsService implements PublishSubscribe<ElevatedSettingsServiceTopicPayloads> {
    private _instances = new Map<string, ElevatedSettingInstance<any, any>>();
    // Sorted by registration order - rebuilt on add/remove only, so the snapshot stays reference-stable.
    private _activeSettings: readonly ElevatedSettingInstance<any, any>[] = [];
    private _instanceUnsubscribeFunctions = new Map<string, () => void>();
    private _stateRevision = 0;

    private readonly _publishSubscribeDelegate = new PublishSubscribeDelegate<ElevatedSettingsServiceTopicPayloads>();

    getPublishSubscribeDelegate(): PublishSubscribeDelegate<ElevatedSettingsServiceTopicPayloads> {
        return this._publishSubscribeDelegate;
    }

    makeSnapshotGetter<T extends ElevatedSettingsServiceTopic>(topic: T): () => ElevatedSettingsServiceTopicPayloads[T] {
        const snapshotGetter = (): any => {
            switch (topic) {
                case ElevatedSettingsServiceTopic.ACTIVE_SETTINGS:
                    return this._activeSettings;
                case ElevatedSettingsServiceTopic.STATE_REVISION:
                    return this._stateRevision;
                default:
                    throw new Error(`Unknown topic: ${topic}`);
            }
        };

        return snapshotGetter;
    }

    addSetting<TValue, TConstraints>(
        definition: ElevatedSettingDefinition<TValue, TConstraints>,
        options?: AddElevatedSettingOptions<TValue, TConstraints>,
    ): ElevatedSettingInstance<TValue, TConstraints> {
        if (this._instances.has(definition.key)) {
            throw new Error(`Elevated setting '${definition.key}' is already active.`);
        }

        const hasExplicitValue = options !== undefined && "value" in options;

        // Seeded at construction rather than via `setValue` afterwards - adapters connect synchronously
        // when ACTIVE_SETTINGS is published, and must not see the plain default first.
        const instance = new ElevatedSettingInstance(definition, {
            value: hasExplicitValue ? options.value : definition.defaultValue,
            valueSource: hasExplicitValue ? ElevatedSettingValueSource.RESTORED : ElevatedSettingValueSource.USER,
            constraintOverride: options?.constraintOverride,
        });

        this._instances.set(definition.key, instance);
        this._instanceUnsubscribeFunctions.set(
            definition.key,
            instance
                .getPublishSubscribeDelegate()
                .makeSubscriberFunction(ElevatedSettingInstanceTopic.VALUE)(() => this.bumpStateRevision()),
        );

        this.updateActiveSettings();
        this.bumpStateRevision();

        return instance;
    }

    removeSetting(definition: ElevatedSettingDefinition<any, any>): void {
        const instance = this._instances.get(definition.key);
        if (!instance) {
            return;
        }

        this._instanceUnsubscribeFunctions.get(definition.key)?.();
        this._instanceUnsubscribeFunctions.delete(definition.key);
        this._instances.delete(definition.key);
        instance.beforeDestroy();

        this.updateActiveSettings();
        this.bumpStateRevision();
    }

    getSetting<TValue, TConstraints>(
        definition: ElevatedSettingDefinition<TValue, TConstraints>,
    ): ElevatedSettingInstance<TValue, TConstraints> | null {
        return (this._instances.get(definition.key) as ElevatedSettingInstance<TValue, TConstraints>) ?? null;
    }

    hasSetting(definition: ElevatedSettingDefinition<any, any>): boolean {
        return this._instances.has(definition.key);
    }

    getActiveSettings(): readonly ElevatedSettingInstance<any, any>[] {
        return this._activeSettings;
    }

    serializeState(): SerializedElevatedSettingsState {
        const state: SerializedElevatedSettingsState = {};

        for (const instance of this._activeSettings) {
            const definition = instance.getDefinition();
            state[definition.key] = definition.serializeValue(instance.getValue());
        }

        return state;
    }

    // Replaces the active settings with the serialized ones. Values are restored as-is - they are not
    // fixed up if they turn out to be invalid once the constraint sources have reported back.
    deserializeState(state: SerializedElevatedSettingsState): void {
        for (const instance of this._activeSettings) {
            if (!(instance.getDefinition().key in state)) {
                this.removeSetting(instance.getDefinition());
            }
        }

        for (const [key, serializedValue] of Object.entries(state)) {
            const definition = ElevatedSettingRegistry.getRegisteredSetting(key);
            if (!definition) {
                console.warn(`Skipping unknown elevated setting '${key}' in persisted state.`);
                continue;
            }

            let value: unknown;
            try {
                value = definition.deserializeValue(serializedValue);
            } catch (error) {
                console.warn(`Failed to deserialize value of elevated setting '${key}' - skipping it.`, error);
                continue;
            }

            const instance = this._instances.get(key);
            if (instance) {
                instance.setValue(value, ElevatedSettingValueSource.RESTORED);
            } else {
                this.addSetting(definition, { value });
            }
        }
    }

    beforeDestroy(): void {
        for (const instance of this._activeSettings) {
            this.removeSetting(instance.getDefinition());
        }
    }

    private updateActiveSettings(): void {
        this._activeSettings = Array.from(this._instances.values()).sort(
            (a, b) =>
                ElevatedSettingRegistry.getRegistrationIndex(a.getDefinition().key) -
                ElevatedSettingRegistry.getRegistrationIndex(b.getDefinition().key),
        );
        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS);
    }

    private bumpStateRevision(): void {
        this._stateRevision++;
        this._publishSubscribeDelegate.notifySubscribers(ElevatedSettingsServiceTopic.STATE_REVISION);
    }
}
