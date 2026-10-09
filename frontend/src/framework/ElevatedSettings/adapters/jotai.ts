import type { Atom, Getter, WritableAtom } from "jotai";
import { atom } from "jotai";
import { atomEffect } from "jotai-effect";
import { v4 } from "uuid";

import type { ElevatedSettingDefinition } from "../ElevatedSettingDefinition";
import {
    ElevatedSettingInstanceTopic,
    type ElevatedSettingConstraintSourceHandle,
    type ElevatedSettingInstance,
} from "../ElevatedSettingInstance";
import { ElevatedSettingsServiceTopic } from "../ElevatedSettingsService";
import { ElevatedSettingsServiceAtom } from "../ElevatedSettingsServiceAtom";

// Module atoms are shared by every instance of a module, each of them with its own store - so all
// connection state below lives in atoms (one value per store), never in closure variables.

type InstanceAtom<TValue, TConstraints> = Atom<ElevatedSettingInstance<TValue, TConstraints> | null>;

function makeElevatedSettingInstanceAtom<TValue, TConstraints>(
    definition: ElevatedSettingDefinition<TValue, TConstraints>,
): InstanceAtom<TValue, TConstraints> {
    const revisionAtom = atom(0);

    const subscriptionEffect = atomEffect((get, set) => {
        const service = get(ElevatedSettingsServiceAtom);
        if (!service) {
            return;
        }

        return service.getPublishSubscribeDelegate().subscribe(ElevatedSettingsServiceTopic.ACTIVE_SETTINGS, () => {
            set(revisionAtom, (revision) => revision + 1);
        });
    });

    return atom((get) => {
        get(subscriptionEffect);
        get(revisionAtom);

        return get(ElevatedSettingsServiceAtom)?.getSetting(definition) ?? null;
    });
}

function makeElevatedValueAtom<TValue, TConstraints>(
    instanceAtom: InstanceAtom<TValue, TConstraints>,
): Atom<TValue | undefined> {
    const revisionAtom = atom(0);

    const subscriptionEffect = atomEffect((get, set) => {
        const instance = get(instanceAtom);
        if (!instance) {
            return;
        }

        return instance.getPublishSubscribeDelegate().subscribe(ElevatedSettingInstanceTopic.VALUE, () => {
            set(revisionAtom, (revision) => revision + 1);
        });
    });

    return atom((get) => {
        get(subscriptionEffect);
        get(revisionAtom);

        return get(instanceAtom)?.getValue();
    });
}

function wrapAtom<TAtomValue, TArgs extends unknown[], TResult>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    read: (get: Getter) => TAtomValue,
): Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult> {
    if ("write" in baseAtom) {
        // Writes always go to the base atom - i.e. the consumer's own local value, which is kept while
        // the setting is elevated and used again once it no longer is.
        return atom(read, (_get, set, ...args: TArgs): TResult => set(baseAtom, ...args));
    }

    return atom(read);
}

function makeOverrideAtom<TAtomValue, TArgs extends unknown[], TResult, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    instanceAtom: InstanceAtom<TElevatedValue, TElevatedConstraints>,
    mapElevatedValue: (elevatedValue: TElevatedValue, get: Getter) => TAtomValue,
) {
    const elevatedValueAtom = makeElevatedValueAtom(instanceAtom);

    return wrapAtom(baseAtom, (get) => {
        // Always read, even while elevated - otherwise the base atom (and any effect it mounts, e.g. a
        // consumer's registration or a persistableFixableAtom's lifecycle) would be unmounted.
        const baseValue = get(baseAtom);

        if (!get(instanceAtom)) {
            return baseValue;
        }

        return mapElevatedValue(get(elevatedValueAtom) as TElevatedValue, get);
    });
}

function makeConsumerAtom<TAtomValue, TArgs extends unknown[], TResult, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    instanceAtom: InstanceAtom<TElevatedValue, TElevatedConstraints>,
    options: AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>,
) {
    const handleAtom = atom<ElevatedSettingConstraintSourceHandle<TElevatedConstraints> | null>(null);

    // Owns the registration only - re-runs when the setting is elevated or removed.
    const connectionEffect = atomEffect((get, set) => {
        const instance = get(instanceAtom);
        if (!instance) {
            return;
        }

        const handle = instance.registerConstraintSource(v4());
        set(handleAtom, handle);

        return () => {
            handle.unregister();
            set(handleAtom, null);
        };
    });

    // Re-runs when the consumer's constraints (or loading state) change.
    const contributionEffect = atomEffect((get) => {
        const handle = get(handleAtom);
        if (!handle) {
            return;
        }

        if (options.isLoading?.(get)) {
            handle.markPending();
            return;
        }

        const constraints = options.getConstraints(get);
        if (constraints === null) {
            handle.clearConstraints();
        } else {
            handle.updateConstraints(constraints);
        }
    });

    return wrapAtom(baseAtom, (get) => {
        get(connectionEffect);
        get(contributionEffect);

        return get(baseAtom);
    });
}

export type AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;
    // Maps the elevated value onto the base atom's value shape (e.g. a `PersistableFixableRead`).
    mapElevatedValue: (elevatedValue: TElevatedValue, get: Getter) => TAtomValue;
};

/**
 * Reads the elevated value (mapped onto the base atom's shape) while the setting is elevated on the
 * dashboard, and the base atom's value otherwise.
 *
 * Keep persisting the base atom rather than the wrapped one - the module's own value is what should be
 * restored, the elevated value is persisted by the dashboard.
 */
export function atomWithElevatedSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): WritableAtom<TAtomValue, TArgs, TResult>;
export function atomWithElevatedSettingOverride<TAtomValue, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): Atom<TAtomValue>;
export function atomWithElevatedSettingOverride<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
) {
    return makeOverrideAtom(
        baseAtom,
        makeElevatedSettingInstanceAtom(options.definition),
        options.mapElevatedValue,
    );
}

export type AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints> = {
    definition: ElevatedSettingDefinition<TElevatedValue, TElevatedConstraints>;
    // The options this consumer offers - `null` when it has no opinion.
    getConstraints: (get: Getter) => TElevatedConstraints | null;
    // While true, the consumer is marked as pending - its options are being recomputed.
    isLoading?: (get: Getter) => boolean;
};

/**
 * Contributes constraints to an elevated setting while the setting is elevated on the dashboard and the
 * returned atom is mounted. Reads (and writes) are passed through to the base atom unchanged.
 */
export function atomWithElevatedSettingConsumer<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>,
): WritableAtom<TAtomValue, TArgs, TResult>;
export function atomWithElevatedSettingConsumer<TAtomValue, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>,
): Atom<TAtomValue>;
export function atomWithElevatedSettingConsumer<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>,
) {
    return makeConsumerAtom(baseAtom, makeElevatedSettingInstanceAtom(options.definition), options);
}

export type MakeElevatedSettingAtomsOptions<TAtomValue, TElevatedValue, TElevatedConstraints> =
    AtomWithElevatedSettingOverrideOptions<TAtomValue, TElevatedValue, TElevatedConstraints> &
        AtomWithElevatedSettingConsumerOptions<TElevatedValue, TElevatedConstraints>;

export type ElevatedSettingAtoms<TValueAtom> = {
    // Reads like the base atom: the elevated value (mapped onto the base atom's shape) while the setting
    // is elevated, the base atom's value otherwise. Contributes the module's options while it is mounted.
    valueAtom: TValueAtom;
    // Whether the setting is elevated on the dashboard of the module this is read in.
    isElevatedAtom: Atom<boolean>;
};

/**
 * Makes a module setting atom follow an elevated setting: `valueAtom` contributes the module's options
 * to it and reads the elevated value while it is active, `isElevatedAtom` tells whether it is. Writes go
 * to the base atom - the module's own value, which is used again once the setting is no longer elevated.
 *
 * Keep persisting the base atom rather than `valueAtom` - the elevated value is persisted by the
 * dashboard.
 */
export function makeElevatedSettingAtoms<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: WritableAtom<TAtomValue, TArgs, TResult>,
    options: MakeElevatedSettingAtomsOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): ElevatedSettingAtoms<WritableAtom<TAtomValue, TArgs, TResult>>;
export function makeElevatedSettingAtoms<TAtomValue, TElevatedValue, TElevatedConstraints>(
    baseAtom: Atom<TAtomValue>,
    options: MakeElevatedSettingAtomsOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): ElevatedSettingAtoms<Atom<TAtomValue>>;
export function makeElevatedSettingAtoms<
    TAtomValue,
    TArgs extends unknown[],
    TResult,
    TElevatedValue,
    TElevatedConstraints,
>(
    baseAtom: Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>,
    options: MakeElevatedSettingAtomsOptions<TAtomValue, TElevatedValue, TElevatedConstraints>,
): ElevatedSettingAtoms<Atom<TAtomValue> | WritableAtom<TAtomValue, TArgs, TResult>> {
    // Shared, so all three only subscribe to the dashboard's active settings once per store.
    const instanceAtom = makeElevatedSettingInstanceAtom(options.definition);

    const consumerAtom = makeConsumerAtom(baseAtom, instanceAtom, options);

    return {
        valueAtom: makeOverrideAtom(consumerAtom, instanceAtom, options.mapElevatedValue),
        isElevatedAtom: atom((get) => get(instanceAtom) !== null),
    };
}
