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
import { WellpicksLayer, WellpicksLayerSettings } from "@modules/Intersection/utils/layers/WellpicksLayer";
import { UseQueryResult, useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type WellpicksLayerSettingsComponentProps = {
    layer: WellpicksLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export const WellpicksLayerSettingsComponent: React.FC<WellpicksLayerSettingsComponentProps> = (props) => {
    const settings = useLayerSettings(props.layer);

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell">Well picks</div>
                <div className="table-cell"></div>
            </div>
        </div>
    );
};

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

function fixupSetting<TSettings extends WellpicksLayerSettings, TKey extends keyof WellpicksLayerSettings>(
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
