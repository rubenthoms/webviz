import React from "react";

import { PolygonsAttributeType_api, PolygonsMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { ColorSelect } from "@lib/components/ColorSelect";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { PolygonLayer, PolygonLayerSettings } from "@modules/2DViewer/layers/PolygonLayer";
import { useLayerSettings } from "@modules/_shared/layers/BaseLayer";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { cloneDeep, isEqual } from "lodash";

import { fixupSetting } from "./utils";

export type PolygonLayerSettingsComponentProps = {
    layer: PolygonLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};
const faultPolygonAttributeTypes = [PolygonsAttributeType_api.FAULT_LINES, PolygonsAttributeType_api.DEPTH];

export function PolygonLayerSettingsComponent(props: PolygonLayerSettingsComponentProps): React.ReactNode {
    //useLayerManagerTopicValue(props.layer.getLayerManager(), LayerManagerTopic.SETTINGS_CHANGED);
    const settings = useLayerSettings(props.layer);
    const [newSettings, setNewSettings] = React.useState<PolygonLayerSettings>(cloneDeep(settings));
    const [prevSettings, setPrevSettings] = React.useState<PolygonLayerSettings>(cloneDeep(settings));
    const overridenSettingsKeys = props.layer.getOverridenSettingsKeys();

    if (!isEqual(settings, prevSettings)) {
        setPrevSettings(settings);
        setNewSettings(settings);
    }

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const usePolygonsDirectoryQuery = usePolygonsMetadataQuery(
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
    const availablePolygonNames: string[] = [];

    if (usePolygonsDirectoryQuery.data) {
        availableAttributes.push(
            ...Array.from(
                new Set(
                    usePolygonsDirectoryQuery.data
                        .filter((el) => !faultPolygonAttributeTypes.includes(el.attribute_type))
                        .map((el) => el.attribute_name)
                )
            )
        );

        const fixupAttribute = fixupSetting("attribute", availableAttributes, newSettings);
        if (!isEqual(fixupAttribute, newSettings.attribute)) {
            setNewSettings((prev) => ({ ...prev, attribute: fixupAttribute }));
        }
    }

    if (usePolygonsDirectoryQuery.data && newSettings.attribute) {
        availablePolygonNames.push(
            ...Array.from(
                new Set(
                    usePolygonsDirectoryQuery.data
                        .filter((el) => el.attribute_name === newSettings.attribute)
                        .map((el) => el.name)
                )
            )
        );

        const fixupPolygonName = fixupSetting("polygonName", availablePolygonNames, newSettings);
        if (!isEqual(fixupPolygonName, newSettings.polygonName)) {
            setNewSettings((prev) => ({ ...prev, polygonName: fixupPolygonName }));
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
            props.layer.setIsSuspended(usePolygonsDirectoryQuery.isFetching);
            if (!usePolygonsDirectoryQuery.isFetching) {
                props.layer.maybeRefetchData();
            }
        },
        [usePolygonsDirectoryQuery.isFetching, props.layer, newSettings]
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

    function handlePolygonNameChange(polygonName: string) {
        setNewSettings((prev) => ({ ...prev, polygonName }));
    }
    function handleColorChange(color: string) {
        setNewSettings((prev) => ({ ...prev, color }));
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
                        disabled={overridenSettingsKeys.includes("ensembleIdent")}
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
                        isPending={usePolygonsDirectoryQuery.isFetching}
                        errorMessage={usePolygonsDirectoryQuery.error?.message}
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
                <div className="table-cell align-middle">Name</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={usePolygonsDirectoryQuery.isFetching}
                        errorMessage={usePolygonsDirectoryQuery.error?.message}
                    >
                        <Dropdown
                            options={makePolygonNamesOptions(availablePolygonNames)}
                            value={newSettings.polygonName ?? undefined}
                            onChange={handlePolygonNameChange}
                            showArrows
                            debounceTimeMs={600}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell align-middle">Color set</div>
                <div className="table-cell">
                    <ColorSelect value={newSettings.color} onChange={handleColorChange} />
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

function makePolygonNamesOptions(polygonNames: string[]): DropdownOption[] {
    return polygonNames.map((polygonName) => ({ label: polygonName, value: polygonName }));
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export function usePolygonsMetadataQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<PolygonsMeta_api[]> {
    return useQuery({
        queryKey: ["getPolygonsDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.polygons.getPolygonsDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(caseUuid && ensembleName),
    });
}
