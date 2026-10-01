import { atom } from "jotai";

import type { ElevatedSettingsService } from "./ElevatedSettingsService";

/**
 * The elevated settings service of the dashboard a module instance belongs to. Set by the Dashboard on
 * each module instance's own atom store - so module atoms (see `adapters/jotai.ts`) can reach it without
 * being handed the service - and null in any other store.
 */
export const ElevatedSettingsServiceAtom = atom<ElevatedSettingsService | null>(null);
