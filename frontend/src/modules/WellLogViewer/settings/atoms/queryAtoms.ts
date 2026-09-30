import { atomWithQuery } from "jotai-tanstack-query";

import { getDrilledWellboreHeadersOptions, getFieldIdentifiersOptions } from "@api";

import { selectedFieldIdentAtom } from "./persistableFixableAtoms";

export const availableFieldsQueryAtom = atomWithQuery(() => {
    return getFieldIdentifiersOptions();
});

export const drilledWellboreHeadersQueryAtom = atomWithQuery((get) => {
    const { value: fieldIdValue, isValidInContext: fieldIdValid } = get(selectedFieldIdentAtom);
    const fieldId = fieldIdValue ?? "";

    return {
        ...getDrilledWellboreHeadersOptions({ query: { field_identifier: fieldId } }),
        enabled: Boolean(fieldId) && fieldIdValid,
    };
});
