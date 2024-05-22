import React from "react";

import { apiService } from "@framework/ApiService";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { WorkbenchSession, useEnsembleRealizationFilterFunc } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import { isIsoStringInterval } from "@framework/utils/timestampUtils";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { SelectOption } from "@lib/components/Select";
import { ColorScale } from "@lib/utils/ColorScale";
import {
    SeismicDataType,
    SeismicDataTypeToStringMapping,
    SeismicSurveyType,
    SeismicSurveyTypeToStringMapping,
} from "@modules/Intersection/typesAndEnums";
import { useLayerSettings } from "@modules/Intersection/utils/layers/BaseLayer";
import { SeismicLayer, SeismicLayerSettings } from "@modules/Intersection/utils/layers/SeismicLayer";
import { ColorScaleSelector } from "@modules/_shared/components/ColorScaleSelector/colorScaleSelector";
import { useQuery } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type SeismicLayerSettingsProps = {
    layer: SeismicLayer;
    ensembleSet: EnsembleSet;
    workbenchSession: WorkbenchSession;
    workbenchSettings: WorkbenchSettings;
};

export const SeismicLayerSettingsComponent: React.FC<SeismicLayerSettingsProps> = (props) => {
    const settings = useLayerSettings(props.layer);

    const ensembleFilterFunc = useEnsembleRealizationFilterFunc(props.workbenchSession);

    const seismicCubeMetaListQuery = useSeismicCubeMetaListQuery(settings.ensembleIdent);

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

    const availableRealizations: number[] = [];
    if (settings.ensembleIdent) {
        availableRealizations.push(...ensembleFilterFunc(settings.ensembleIdent));
    }

    const availableSeismicAttributes: string[] = [];

    const availableSeismicDateOrIntervalStrings: string[] = [];
    if (seismicCubeMetaListQuery.data) {
        availableSeismicAttributes.push(
            ...Array.from(
                new Set(
                    seismicCubeMetaListQuery.data
                        .filter((el) => {
                            return (
                                el.is_depth &&
                                el.is_observation === (settings.dataType === SeismicDataType.OBSERVED) &&
                                ((settings.surveyType === SeismicSurveyType.THREE_D &&
                                    !isIsoStringInterval(el.iso_date_or_interval)) ||
                                    (settings.surveyType === SeismicSurveyType.FOUR_D &&
                                        isIsoStringInterval(el.iso_date_or_interval)))
                            );
                        })
                        .map((el) => el.seismic_attribute)
                )
            )
        );

        availableSeismicDateOrIntervalStrings.push(
            ...Array.from(
                new Set(
                    seismicCubeMetaListQuery.data
                        .filter((el) => {
                            return (
                                el.is_depth &&
                                el.seismic_attribute === settings.attribute &&
                                el.is_observation === (settings.dataType === SeismicDataType.OBSERVED) &&
                                ((settings.surveyType === SeismicSurveyType.THREE_D &&
                                    !isIsoStringInterval(el.iso_date_or_interval)) ||
                                    (settings.surveyType === SeismicSurveyType.FOUR_D &&
                                        isIsoStringInterval(el.iso_date_or_interval)))
                            );
                        })
                        .map((el) => el.iso_date_or_interval)
                )
            )
        );
    }

    if (seismicCubeMetaListQuery.data) {
        const fixupAttribute = fixupSetting("attribute", availableSeismicAttributes, settings);
        if (!isEqual(fixupAttribute, settings.attribute)) {
            props.layer.maybeUpdateSettings({ attribute: fixupAttribute });
        }

        const fixupDateOrInterval = fixupSetting("dateOrInterval", availableSeismicDateOrIntervalStrings, settings);
        if (!isEqual(fixupDateOrInterval, settings.dateOrInterval)) {
            props.layer.maybeUpdateSettings({ dateOrInterval: fixupDateOrInterval });
        }
    }

    let seismicCubeMetaListErrorMessage = "";
    if (seismicCubeMetaListQuery.isError) {
        seismicCubeMetaListErrorMessage = "Failed to load seismic cube meta list";
    }

    function handleEnsembleChange(ensembleIdent: EnsembleIdent | null) {
        props.layer.maybeUpdateSettings({ ensembleIdent });
    }

    function handleRealizationChange(realizationNum: string) {
        props.layer.maybeUpdateSettings({ realizationNum: parseInt(realizationNum) });
    }

    function handleDataTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.layer.maybeUpdateSettings({ dataType: event.target.value as SeismicDataType });
    }

    function handleSurveyTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.layer.maybeUpdateSettings({ surveyType: event.target.value as SeismicSurveyType });
    }

    function handleAttributeChange(selected: string) {
        props.layer.maybeUpdateSettings({ attribute: selected });
    }

    function handleDateOrIntervalChange(selected: string) {
        props.layer.maybeUpdateSettings({ dateOrInterval: selected });
    }

    function handleColorScaleChange(newColorScale: ColorScale, areBoundariesUserDefined: boolean) {
        props.layer.setColorScale(newColorScale);
        props.layer.setUseCustomColorScaleBoundaries(areBoundariesUserDefined);
    }

    return (
        <div className="table text-sm border-spacing-y-2 border-spacing-x-3">
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
                <div className="table-cell">Data type</div>
                <div className="table-cell">
                    <RadioGroup
                        options={[
                            {
                                label: SeismicDataTypeToStringMapping[SeismicDataType.SIMULATED],
                                value: SeismicDataType.SIMULATED,
                            },
                            {
                                label: SeismicDataTypeToStringMapping[SeismicDataType.OBSERVED],
                                value: SeismicDataType.OBSERVED,
                            },
                        ]}
                        value={props.layer.getSettings().dataType}
                        onChange={handleDataTypeChange}
                        direction="horizontal"
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Survey type</div>
                <div className="table-cell">
                    <RadioGroup
                        options={[
                            {
                                label: SeismicSurveyTypeToStringMapping[SeismicSurveyType.THREE_D],
                                value: SeismicSurveyType.THREE_D,
                            },
                            {
                                label: SeismicSurveyTypeToStringMapping[SeismicSurveyType.FOUR_D],
                                value: SeismicSurveyType.FOUR_D,
                            },
                        ]}
                        value={props.layer.getSettings().surveyType}
                        onChange={handleSurveyTypeChange}
                        direction="horizontal"
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Attribute</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={seismicCubeMetaListQuery.isFetching}
                        errorMessage={seismicCubeMetaListErrorMessage}
                    >
                        <Dropdown
                            options={makeAttributeOptions(availableSeismicAttributes)}
                            value={props.layer.getSettings().attribute ?? undefined}
                            onChange={handleAttributeChange}
                            showArrows
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Date or interval</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={seismicCubeMetaListQuery.isFetching}
                        errorMessage={seismicCubeMetaListErrorMessage}
                    >
                        <Dropdown
                            options={makeDateOrIntervalStringOptions(availableSeismicDateOrIntervalStrings)}
                            value={props.layer.getSettings().dateOrInterval ?? undefined}
                            onChange={handleDateOrIntervalChange}
                            showArrows
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Color scale</div>
                <div className="table-cell">
                    <ColorScaleSelector
                        colorScale={props.layer.getColorScale()}
                        areBoundariesUserDefined={props.layer.getUseCustomColorScaleBoundaries()}
                        workbenchSettings={props.workbenchSettings}
                        onChange={handleColorScaleChange}
                    />
                </div>
            </div>
        </div>
    );
};

function makeRealizationOptions(realizations: readonly number[]): DropdownOption[] {
    return realizations.map((realization) => ({ label: realization.toString(), value: realization.toString() }));
}

function makeAttributeOptions(availableSeismicAttributes: string[]): SelectOption[] {
    return availableSeismicAttributes.map((attribute) => ({
        label: attribute,
        value: attribute,
    }));
}

function makeDateOrIntervalStringOptions(availableSeismicDateOrIntervalStrings: string[]): SelectOption[] {
    return availableSeismicDateOrIntervalStrings.map((dateOrInterval) => ({
        label: dateOrInterval,
        value: dateOrInterval,
    }));
}

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

function useSeismicCubeMetaListQuery(ensembleIdent: EnsembleIdent | null) {
    return useQuery({
        queryKey: ["getSeismicCubeMetaList", ensembleIdent?.getCaseUuid(), ensembleIdent?.getEnsembleName()],
        queryFn: () =>
            apiService.seismic.getSeismicCubeMetaList(
                ensembleIdent?.getCaseUuid() ?? "",
                ensembleIdent?.getEnsembleName() ?? ""
            ),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        enabled: Boolean(ensembleIdent),
    });
}

function fixupSetting<TSettings extends SeismicLayerSettings, TKey extends keyof SeismicLayerSettings>(
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
