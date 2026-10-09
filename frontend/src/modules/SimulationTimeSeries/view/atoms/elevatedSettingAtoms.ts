import { atom } from "jotai";

import {
    makeElevatedPersistableFixableAtoms,
    makeElevatedSettingAtoms,
} from "@framework/ElevatedSettings/adapters/jotai";
import { REALIZATION_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/realization";
import { TIME_ELEVATED_SETTING } from "@framework/ElevatedSettings/definitions/time";

import { loadedVectorSpecificationsAndRealizationDataAtom, queryIsFetchingAtom } from "./derivedAtoms";
import { activeTimestampUtcMsAtom } from "./persistableFixableAtoms";

/**
 * The realization to highlight in the plot: the dashboard's elevated realization while that is active,
 * none otherwise - the module has no realization selection of its own. Contributes the realizations of
 * the loaded realization data to the elevated setting.
 */
export const { valueAtom: highlightedRealizationAtom } = makeElevatedSettingAtoms(atom<number | null>(null), {
    definition: REALIZATION_ELEVATED_SETTING,
    // No realization data loaded (e.g. statistics only) means no opinion, rather than "no realizations"
    getConstraints: (get) => {
        const realizations = new Set<number>();
        for (const vectorSpecificationAndData of get(loadedVectorSpecificationsAndRealizationDataAtom)) {
            for (const realizationData of vectorSpecificationAndData.data) {
                realizations.add(realizationData.realization);
            }
        }

        return realizations.size > 0 ? Array.from(realizations).sort((a, b) => a - b) : null;
    },
    isLoading: (get) => get(queryIsFetchingAtom),
    mapElevatedValue: (elevatedRealization) => elevatedRealization,
});

/**
 * The timestamp of the time annotation: the dashboard's elevated time while that is active, otherwise the
 * module's own (clicked) timestamp. Read-only - the module doesn't contribute time options, as raw time
 * series would flood the elevated time with every sample date. Persist `activeTimestampUtcMsAtom`.
 */
export const { valueAtom: effectiveActiveTimestampUtcMsAtom } = makeElevatedPersistableFixableAtoms(
    activeTimestampUtcMsAtom,
    { definition: TIME_ELEVATED_SETTING },
);
