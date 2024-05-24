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
import { Switch } from "@lib/components/Switch";
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

    function handleToggleFilterPicks(e: React.ChangeEvent<HTMLInputElement>) {
        const checked = e.target.checked;
        props.layer.maybeUpdateSettings({ filterPicks: checked });
    }

    function handlePickSelectionChange(selectedPicks: string[]) {
        props.layer.maybeUpdateSettings({ selectedPicks });
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3 w-full">
            <div className="table-row">
                <div className="table-cell">Filter picks</div>
                <div className="table-cell">
                    <Switch checked={settings.filterPicks} onChange={handleToggleFilterPicks} />
                    <Select
                        options={
                            props.layer.getData()?.wellbore_picks.map((el) => ({
                                label: el.pickIdentifier,
                                value: el.pickIdentifier,
                            })) ?? []
                        }
                        value={settings.selectedPicks}
                        onChange={handlePickSelectionChange}
                        multiple
                        size={5}
                        disabled={!settings.filterPicks}
                    />
                </div>
            </div>
        </div>
    );
};

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

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
