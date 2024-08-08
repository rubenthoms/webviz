import React from "react";

import { SurfaceAttributeType_api, SurfaceMetaSet_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import { SurfaceLayer, SurfaceLayerSettings } from "@modules/2DViewer/layers/SurfaceLayer";
import { useLayerSettings } from "@modules/_shared/layers/BaseLayer";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { cloneDeep, isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type SurfaceLayerSettingsComponentProps = {
    layer: SurfaceLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export function SurfaceLayerSettingsComponent(props: SurfaceLayerSettingsComponentProps): React.ReactNode {
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<SurfaceLayerSettings>(cloneDeep(settings));
    const [prevSettings, setPrevSettings] = React.useState<SurfaceLayerSettings>(cloneDeep(settings));

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(settings);
        setNewSettings(settings);
    }

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const surfaceDirectoryQuery = useRealizationSurfacesMetadataQuery(
        newSettings.ensembleIdent?.getCaseUuid(),
        newSettings.ensembleIdent?.getEnsembleName()
    );

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        newSettings
    );
    if (!isEqual(fixupEnsembleIdent, newSettings.ensembleIdent)) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent: fixupEnsembleIdent }));
    }

    if (fixupEnsembleIdent) {
        const fixupRealizationNum = fixupSetting("realizationNum", ensembleFilterFunc(fixupEnsembleIdent), newSettings);
        if (!isEqual(fixupRealizationNum, newSettings.realizationNum)) {
            setNewSettings((prev) => ({ ...prev, realizationNum: fixupRealizationNum }));
        }
    }

    const availableAttributes: string[] = [];
    const availableSurfaceNames: string[] = [];

    if (surfaceDirectoryQuery.data) {
        availableAttributes.push(
            ...Array.from(
                new Set(
                    surfaceDirectoryQuery.data.surfaces
                        .filter((el) => el.attribute_type === SurfaceAttributeType_api.DEPTH)
                        .map((el) => el.attribute_name)
                )
            )
        );

        const fixupAttribute = fixupSetting("attribute", availableAttributes, newSettings);
        if (!isEqual(fixupAttribute, newSettings.attribute)) {
            setNewSettings((prev) => ({ ...prev, attribute: fixupAttribute }));
        }
    }

    if (surfaceDirectoryQuery.data && newSettings.attribute) {
        availableSurfaceNames.push(
            ...Array.from(
                new Set(
                    surfaceDirectoryQuery.data.surfaces
                        .filter((el) => el.attribute_name === newSettings.attribute)
                        .map((el) => el.name)
                )
            )
        );

        const fixupSurfaceNames = fixupSurfaceNamesSetting(newSettings.surfaceNames, availableSurfaceNames);
        if (!isEqual(fixupSurfaceNames, newSettings.surfaceNames)) {
            setNewSettings((prev) => ({ ...prev, surfaceNames: fixupSurfaceNames }));
        }

        props.layer.maybeRefetchData();
    }

    React.useEffect(
        function propagateSettingsChange() {
            props.layer.maybeUpdateSettings(cloneDeep(newSettings));
        },
        [newSettings, props.layer]
    );

    React.useEffect(
        function maybeRefetchData() {
            props.layer.setIsSuspended(surfaceDirectoryQuery.isFetching);
            if (!surfaceDirectoryQuery.isFetching) {
                props.layer.maybeRefetchData();
            }
        },
        [surfaceDirectoryQuery.isFetching, props.layer, newSettings]
    );

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        setNewSettings((prev) => ({ ...prev, ensembleIdent }));
    }

    function handleRealizationChange(realizationNum: string) {
        setNewSettings((prev) => ({ ...prev, realizationNum: parseInt(realizationNum) }));
    }

    function handleAttributeChange(attribute: string) {
        setNewSettings((prev) => ({ ...prev, attribute }));
    }

    function handleSurfaceNamesChange(surfaceNames: string[]) {
        setNewSettings((prev) => ({ ...prev, surfaceNames }));
    }

    const availableRealizations: number[] = [];
    if (fixupEnsembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(fixupEnsembleIdent));
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell w-24 align-middle">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Realization</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeRealizationOptions(availableRealizations)}
                        value={newSettings.realizationNum?.toString() ?? undefined}
                        onChange={handleRealizationChange}
                        showArrows
                        debounceTimeMs={600}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Attribute</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={surfaceDirectoryQuery.isFetching}
                        errorMessage={surfaceDirectoryQuery.error?.message}
                    >
                        <Dropdown
                            options={makeAttributeOptions(availableAttributes)}
                            value={newSettings.attribute ?? undefined}
                            onChange={handleAttributeChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-top">Surface names</div>
                <div className="table-cell max-w-0">
                    <PendingWrapper
                        isPending={surfaceDirectoryQuery.isFetching}
                        errorMessage={surfaceDirectoryQuery.error?.message}
                    >
                        <Select
                            options={makeSurfaceNameOptions(availableSurfaceNames)}
                            value={newSettings.surfaceNames ?? undefined}
                            onChange={handleSurfaceNamesChange}
                            size={5}
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
        </div>
    );
}

function makeRealizationOptions(realizations: readonly number[]): DropdownOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeAttributeOptions(attributes: string[]): DropdownOption[] {
    return attributes.map((attr) => ({ label: attr, value: attr }));
}

function makeSurfaceNameOptions(surfaceNames: string[]): DropdownOption[] {
    return surfaceNames.map((surfaceName) => ({ label: surfaceName, value: surfaceName }));
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function useRealizationSurfacesMetadataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfaceMetaSet_api> {
    return useQuery({
        queryKey: ["getRealizationSurfacesMetadata", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getRealizationSurfacesMetadata(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid && ensembleName),
    });
}

function fixupSurfaceNamesSetting(currentSurfaceNames: string[], validSurfaceNames: string[]): string[] {
    if (validSurfaceNames.length === 0) {
        return currentSurfaceNames;
    }

    let adjustedSurfaceNames = currentSurfaceNames.filter((el) => validSurfaceNames.includes(el));

    if (adjustedSurfaceNames.length === 0) {
        adjustedSurfaceNames = [validSurfaceNames[0]];
    }

    return adjustedSurfaceNames;
}
