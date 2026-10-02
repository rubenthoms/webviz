import { atom, createStore } from "jotai";
import { describe, expect, it } from "vitest";

import { makeElevatedSettingAtoms } from "@framework/ElevatedSettings/adapters/jotai";
import { ElevatedSettingDefinition } from "@framework/ElevatedSettings/ElevatedSettingDefinition";
import { ElevatedSettingsService } from "@framework/ElevatedSettings/ElevatedSettingsService";
import { ElevatedSettingsServiceAtom } from "@framework/ElevatedSettings/ElevatedSettingsServiceAtom";

const DEFINITION = new ElevatedSettingDefinition<string | null, readonly string[]>({
    key: "adapter-test",
    label: "Adapter test",
    defaultValue: null,
    initialConstraints: [],
    isValueValid: (value, constraints) => (value === null ? constraints.length === 0 : constraints.includes(value)),
    fixupValue: (_value, constraints) => constraints[0] ?? null,
    Component: () => null,
});

// Stands in for a module's atoms: a local value, the options it can offer, and whether those are loading.
// The atoms are shared by every "module instance", each of which gets its own store - like real modules.
const localValueAtom = atom<string | null>("local");
const availableOptionsAtom = atom<string[]>(["a", "b"]);
const isLoadingAtom = atom(false);

const { valueAtom: elevatedValueAtom, isElevatedAtom } = makeElevatedSettingAtoms(localValueAtom, {
    definition: DEFINITION,
    getConstraints: (get) => get(availableOptionsAtom),
    isLoading: (get) => get(isLoadingAtom),
    mapElevatedValue: (elevatedValue) => elevatedValue,
});

function makeModuleStore(service: ElevatedSettingsService) {
    const store = createStore();
    store.set(ElevatedSettingsServiceAtom, service);
    store.sub(elevatedValueAtom, () => {});
    store.sub(isElevatedAtom, () => {});
    return store;
}

describe("makeElevatedSettingAtoms", () => {
    it("reads the local value while the setting isn't elevated", () => {
        const store = makeModuleStore(new ElevatedSettingsService());

        expect(store.get(elevatedValueAtom)).toBe("local");
        expect(store.get(isElevatedAtom)).toBe(false);
    });

    it("tells whether the setting is elevated", () => {
        const service = new ElevatedSettingsService();
        const store = makeModuleStore(service);

        service.addSetting(DEFINITION);
        expect(store.get(isElevatedAtom)).toBe(true);

        service.removeSetting(DEFINITION);
        expect(store.get(isElevatedAtom)).toBe(false);
    });

    it("contributes its options and reads the elevated value once elevated", () => {
        const service = new ElevatedSettingsService();
        const store = makeModuleStore(service);

        const instance = service.addSetting(DEFINITION);

        expect(instance.getConstraints()).toEqual(["a", "b"]);
        expect(instance.getSourceCount()).toBe(1);
        expect(store.get(elevatedValueAtom)).toBe("a");

        instance.setValue("b");
        expect(store.get(elevatedValueAtom)).toBe("b");
    });

    it("updates its contribution, and marks itself pending while loading", () => {
        const service = new ElevatedSettingsService();
        const store = makeModuleStore(service);
        const instance = service.addSetting(DEFINITION);

        store.set(isLoadingAtom, true);
        expect(instance.isSettling()).toBe(true);

        store.set(availableOptionsAtom, ["c"]);
        store.set(isLoadingAtom, false);
        expect(instance.isSettling()).toBe(false);
        expect(instance.getConstraints()).toEqual(["c"]);

        // Already settled before - an invalid value is kept and reported, not fixed up.
        expect(store.get(elevatedValueAtom)).toBe("a");
        expect(instance.isValueValid()).toBe(false);
    });

    it("keeps the contributions of several instances of the same module apart", () => {
        const service = new ElevatedSettingsService();
        const firstStore = makeModuleStore(service);
        const secondStore = makeModuleStore(service);
        secondStore.set(availableOptionsAtom, ["c"]);

        const instance = service.addSetting(DEFINITION);

        expect(instance.getSourceCount()).toBe(2);
        expect(instance.getConstraints()).toEqual(["a", "b", "c"]);
        expect(firstStore.get(elevatedValueAtom)).toBe("a");
        expect(secondStore.get(elevatedValueAtom)).toBe("a");
    });

    it("falls back to the local value and withdraws once the setting is removed", () => {
        const service = new ElevatedSettingsService();
        const store = makeModuleStore(service);
        const instance = service.addSetting(DEFINITION);

        service.removeSetting(DEFINITION);

        expect(store.get(elevatedValueAtom)).toBe("local");
        expect(instance.getSourceCount()).toBe(0);
    });

    it("writes to the local value", () => {
        const service = new ElevatedSettingsService();
        const store = makeModuleStore(service);
        const instance = service.addSetting(DEFINITION);

        store.set(elevatedValueAtom, "written");

        expect(store.get(localValueAtom)).toBe("written");
        expect(instance.getValue()).toBe("a");
    });
});
