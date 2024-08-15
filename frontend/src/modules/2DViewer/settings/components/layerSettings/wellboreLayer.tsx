import React from "react";

import { SurfaceAttributeType_api, SurfaceMetaSet_api, WellboreHeader_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import { WellboreLayer } from "@modules/2DViewer/layers/WellboreLayer";
import { WellboreLayerSettings } from "@modules/2DViewer/layers/WellboreLayer";
import { WellboreSelector } from "@modules/3DViewer/settings/components/wellboreSelector";
import { useLayerSettings } from "@modules/_shared/layers/BaseLayer";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { cloneDeep, isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type WellboreLayerSettingsComponentProps = {
    layer: WellboreLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function WellboreLayerSettingsComponent(props: WellboreLayerSettingsComponentProps): React.ReactNode {
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<WellboreLayerSettings>(cloneDeep(settings));
    const [prevSettings, setPrevSettings] = React.useState<WellboreLayerSettings>(cloneDeep(settings));

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(settings);
        setNewSettings(settings);
    }

    let fieldIdentifier: string | null = null;
    if (newSettings.ensembleIdent) {
        const ensemble = props.ensembleSet.findEnsemble(newSettings.ensembleIdent);
        if (ensemble) {
            fieldIdentifier = ensemble.getFieldIdentifier();
        }
    }
    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        newSettings
    );
    if (!isEqual(fixupEnsembleIdent, newSettings.ensembleIdent)) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent: fixupEnsembleIdent }));
    }

    if (fieldIdentifier !== newSettings.fieldIdentifier) {
        setNewSettings((prev) => ({ ...prev, fieldIdentifier: fieldIdentifier }));
    }
    const drilledWellboreHeadersDirectoryQuery = useDrilledWellboreHeadersQuery(fieldIdentifier);

    const availableWellboreHeaders: WellboreHeader_api[] = drilledWellboreHeadersDirectoryQuery.data
        ? drilledWellboreHeadersDirectoryQuery.data
        : [];
    const availableUuids: string[] = availableWellboreHeaders.map((header) => header.wellboreUuid);

    const fixupUuids = fixupWellboreUuids(availableUuids, newSettings.wellboreUuids);
    if (!isEqual(fixupUuids, newSettings.wellboreUuids)) {
        setNewSettings((prev) => ({ ...prev, wellboreUuids: fixupUuids }));
    }

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(cloneDeep(newSettings));
        },
        [newSettings, props.layer]
    );

    React.useEffect(
        function maybeRefetchData() {
            props.layer.setIsSuspended(drilledWellboreHeadersDirectoryQuery.isFetching);
            if (!drilledWellboreHeadersDirectoryQuery.isFetching) {
                props.layer.maybeRefetchData();
            }
        },
        [drilledWellboreHeadersDirectoryQuery.isFetching, props.layer, newSettings]
    );

    function handleUiidsChange(wellboreUuids: string[]) {
        setNewSettings((prev) => ({ ...prev, wellboreUuids }));
    }

    return (
        <WellboreSelector
            wellboreHeaders={availableWellboreHeaders}
            selectedWellboreUuids={newSettings.wellboreUuids}
            onSelectedWellboreUuidsChange={handleUiidsChange}
        />
    );
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useDrilledWellboreHeadersQuery(fieldIdentifier: string | null): UseQueryResult<WellboreHeader_api[]> {
    return useQuery({
        queryKey: ["getDrilledWellboreHeaders", fieldIdentifier],
        queryFn: () => apiService.well.getDrilledWellboreHeaders(fieldIdentifier || ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(fieldIdentifier),
    });
}

function fixupWellboreUuids(currentUuids: string[], validUuids: string[]): string[] {
    if (validUuids.length === 0) {
        return [];
    }

    let adjustedUuids = currentUuids.filter((el) => validUuids.includes(el));

    if (adjustedUuids.length === 0) {
        adjustedUuids = [validUuids[0]];
    }

    return adjustedUuids;
}
