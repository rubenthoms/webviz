import { EnsembleSetAtom } from "@framework/GlobalAtoms";

import { atom } from "jotai";

import {
    colorByAtom,
    groupByAtom,
    userSelectedEnsembleIdentsAtom,
    userSelectedInplaceCategoriesAtom,
    userSelectedInplaceResponseAtom,
    userSelectedInplaceTableNameAtom,
} from "./baseAtoms";
import { inplaceTableInfosQueryAtom } from "./queryAtoms";

import { findCommonTablesAcrossCollections } from "../../utils/intersectTableInfos";

export const selectedEnsembleIdentsAtom = atom((get) => {
    const ensembleSet = get(EnsembleSetAtom);
    const userSelectedEnsembleIdents = get(userSelectedEnsembleIdentsAtom);
    const groupBy = get(groupByAtom);
    const colorBy = get(colorByAtom);
    let computedEnsembleIdents = userSelectedEnsembleIdents.filter((el) => ensembleSet.hasEnsemble(el));
    if (computedEnsembleIdents.length === 0 && ensembleSet.getEnsembleArr().length > 0) {
        computedEnsembleIdents = [ensembleSet.getEnsembleArr()[0].getIdent()];
    }
    if (computedEnsembleIdents.length > 1 && groupBy !== "Ensemble" && colorBy !== "Ensemble") {
        computedEnsembleIdents = [computedEnsembleIdents[0]];
    }

    return computedEnsembleIdents;
});

export const intersectedTablesAtom = atom((get) => {
    const inplaceTableInfosQuery = get(inplaceTableInfosQueryAtom);
    return findCommonTablesAcrossCollections(inplaceTableInfosQuery.tableInfoCollections);
});

export const availableInplaceTableNamesAtom = atom((get) => {
    const intersectedTables = get(intersectedTablesAtom);
    return intersectedTables.map((table) => table.name);
});

export const selectedInplaceTableNameAtom = atom((get) => {
    const userSelectedInplaceTableName = get(userSelectedInplaceTableNameAtom);
    const availableInplaceTableNames = get(availableInplaceTableNamesAtom);
    if (userSelectedInplaceTableName && availableInplaceTableNames.includes(userSelectedInplaceTableName)) {
        return userSelectedInplaceTableName;
    }
    return availableInplaceTableNames.length ? availableInplaceTableNames[0] : null;
});

export const availableInplaceResponsesAtom = atom((get) => {
    const intersectedTables = get(intersectedTablesAtom);
    const selectedInplaceTableName = get(selectedInplaceTableNameAtom);
    const selectedTable = intersectedTables.find((table) => table.name === selectedInplaceTableName);
    return selectedTable?.result_names || [];
});
export const selectedInplaceResponseAtom = atom((get) => {
    const availableInplaceResponses = get(availableInplaceResponsesAtom);
    const userSelectedInplaceResponse = get(userSelectedInplaceResponseAtom);
    if (userSelectedInplaceResponse && availableInplaceResponses.includes(userSelectedInplaceResponse)) {
        return userSelectedInplaceResponse;
    }
    if (availableInplaceResponses.length) {
        if (availableInplaceResponses.includes("STOIIP_OIL")) {
            return "STOIIP_OIL";
        }
        return availableInplaceResponses[0];
    }
    return null;
});
export const availableInplaceCategoriesAtom = atom((get) => {
    const intersectedTables = get(intersectedTablesAtom);
    const selectedInplaceTableName = get(selectedInplaceTableNameAtom);
    const selectedTable = intersectedTables.find((table) => table.name === selectedInplaceTableName);
    return selectedTable?.indexes ?? [];
});

export const selectedInplaceCategoriesAtom = atom((get) => {
    const availableInplaceCategories = get(availableInplaceCategoriesAtom);

    const userSelectedInplaceCategories = get(userSelectedInplaceCategoriesAtom);

    if (userSelectedInplaceCategories.length) {
        return availableInplaceCategories.map((category) => {
            const userSelectedCategory = userSelectedInplaceCategories.find(
                (selectedCategory) => selectedCategory.index_name === category.index_name
            );
            if (userSelectedCategory && userSelectedCategory.values.length) {
                return userSelectedCategory;
            }
            return category;
        });
    }

    return availableInplaceCategories;
});