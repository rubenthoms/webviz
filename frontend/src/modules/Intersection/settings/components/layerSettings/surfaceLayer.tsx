import React from "react";

import { SurfaceAttributeType_api, SurfaceMeta_api } from "@api";
import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { defaultColorPalettes } from "@framework/utils/colorPalettes";
import { ColorPaletteSelector, ColorPaletteSelectorType } from "@lib/components/ColorPaletteSelector";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { Select } from "@lib/components/Select";
import { ColorPalette } from "@lib/utils/ColorPalette";
import { ColorSet } from "@lib/utils/ColorSet";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { SurfaceLayer, SurfaceLayerSettings } from "@modules/Intersection/utils/layers/SurfaceLayer";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type SurfaceLayerSettingsComponentProps = {
    layer: SurfaceLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export const SurfaceLayerSettingsComponent: React.FC<SurfaceLayerSettingsComponentProps> = (props) => {
    const settings = useLayerSettings(props.layer);

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        settings.ensembleIdent?.getCaseUuid(),
        settings.ensembleIdent?.getEnsembleName()
    );

    const fixupEnsembleIdent = fixupSetting(
        "ensembleIdent",
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent()),
        settings
    );
    if (!isEqual(fixupEnsembleIdent, settings.ensembleIdent)) {
        props.layer.maybeUpdateSettings({ ensembleIdent: fixupEnsembleIdent });
    }

    if (settings.ensembleIdent) {
        const fixupRealizationNum = fixupSetting(
            "realizationNum",
            ensembleFilterFunc(settings.ensembleIdent),
            settings
        );
        if (!isEqual(fixupRealizationNum, settings.realizationNum)) {
            props.layer.maybeUpdateSettings({ realizationNum: fixupRealizationNum });
        }
    }

    const availableAttributes: string[] = [];

    if (surfaceDirectoryQuery.data) {
        availableAttributes.push(
            ...Array.from(
                new Set(
                    surfaceDirectoryQuery.data
                        .filter((el) => el.attribute_type === SurfaceAttributeType_api.DEPTH)
                        .map((el) => el.attribute_name)
                )
            )
        );

        const fixupAttribute = fixupSetting(
            "attribute",
            Array.from(new Set(surfaceDirectoryQuery.data.map((el) => el.attribute_name))),
            settings
        );
        if (!isEqual(fixupAttribute, settings.attribute)) {
            props.layer.maybeUpdateSettings({ attribute: fixupAttribute });
        }
    }

    /*
    function updateBoundingBox(gridModelName: string) {
        const gridModelInfo = gridModelInfosQuery.data?.find((info) => info.grid_name === gridModelName) ?? null;
        if (gridModelInfo) {
            const boundingBox: BoundingBox = {
                x: [gridModelInfo.bbox.xmin, gridModelInfo.bbox.xmax],
                y: [gridModelInfo.bbox.ymin, gridModelInfo.bbox.ymax],
                z: [gridModelInfo.bbox.zmin, gridModelInfo.bbox.zmax],
            };
            props.layer.setBoundingBox(boundingBox);
        }
    }
    */

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        props.layer.maybeUpdateSettings({ ensembleIdent });
    }

    function handleRealizationChange(realizationNum: string) {
        props.layer.maybeUpdateSettings({ realizationNum: parseInt(realizationNum) });
    }

    function handleAttributeChange(attribute: string) {
        props.layer.maybeUpdateSettings({ attribute });
    }

    function handleSurfaceNamesChange(surfaceNames: string[]) {
        props.layer.maybeUpdateSettings({ surfaceNames });
    }

    function handleColorPaletteChange(colorPalette: ColorPalette) {
        props.layer.setColorSet(new ColorSet(colorPalette));
    }

    const availableRealizations: number[] = [];
    if (settings.ensembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(settings.ensembleIdent));
    }

    const availableSurfaceNames: string[] = [];
    if (surfaceDirectoryQuery.data && settings.attribute) {
        availableSurfaceNames.push(
            ...Array.from(
                new Set(
                    surfaceDirectoryQuery.data
                        .filter((el) => el.attribute_name === settings.attribute)
                        .map((el) => el.name)
                )
            )
        );
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell">Ensemble</div>
                <div className="table-cell">
                    <EnsembleDropdown
                        value={props.layer.getSettings().ensembleIdent}
                        ensembleSet={props.ensembleSet}
                        onChange={handleEnsembleChange}
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Realization</div>
                <div className="table-cell">
                    <Dropdown
                        options={makeRealizationOptions(availableRealizations)}
                        value={settings.realizationNum?.toString() ?? undefined}
                        onChange={handleRealizationChange}
                        showArrows
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Attribute</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={surfaceDirectoryQuery.isFetching}
                        errorMessage={surfaceDirectoryQuery.error?.message}
                    >
                        <Dropdown
                            options={makeAttributeOptions(availableAttributes)}
                            value={settings.attribute ?? undefined}
                            onChange={handleAttributeChange}
                            showArrows
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
                            value={settings.surfaceNames ?? undefined}
                            onChange={handleSurfaceNamesChange}
                            size={5}
                            multiple
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Color set</div>
                <div className="table-cell">
                    <ColorPaletteSelector
                        type={ColorPaletteSelectorType.Categorical}
                        selectedColorPaletteId={props.layer.getColorSet().getColorPalette().getId()}
                        colorPalettes={defaultColorPalettes}
                        onChange={handleColorPaletteChange}
                    />
                </div>
            </div>
        </div>
    );
};

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

export function useSurfaceDirectoryQuery(
    caseUuid: string | undefined,
    ensembleName: string | undefined
): UseQueryResult<SurfaceMeta_api[]> {
    return useQuery({
        queryKey: ["getSurfaceDirectory", caseUuid, ensembleName],
        queryFn: () => apiService.surface.getSurfaceDirectory(caseUuid ?? "", ensembleName ?? ""),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: caseUuid && ensembleName ? true : false,
    });
}

function fixupSetting<TSettings extends SurfaceLayerSettings, TKey extends keyof SurfaceLayerSettings>(
    setting: TKey,
    validOptions: readonly TSettings[TKey][],
    settings: TSettings
): TSettings[TKey] {
    if (validOptions.length === 0) {
        return settings[setting];
    }

    if (!validOptions.includes(settings[setting]) || settings[setting] === null) {
        return validOptions[0];
    }

    return settings[setting];
}
