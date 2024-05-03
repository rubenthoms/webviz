import { Grid3dInfo_api, Grid3dPropertyInfo_api } from "@api";
import { Dropdown, DropdownOption } from "@lib/components/Dropdown";
import { Label } from "@lib/components/Label";
import { PendingWrapper } from "@lib/components/PendingWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import {
    GridLayer,
    SeismicDataType,
    SeismicDataTypeToStringMapping,
    SeismicLayer,
    SeismicSurveyType,
    SeismicSurveyTypeToStringMapping,
} from "@modules/Intersection/typesAndEnums";

import { useAtomValue } from "jotai";

import { availableSeismicAttributesAtom, availableSeismicDateOrIntervalStringsAtom } from "../../atoms/derivedAtoms";
import { seismicCubeMetaListQueryAtom } from "../../atoms/queryAtoms";

export type SeismicLayerSettingsProps = {
    layer: SeismicLayer;
    updateSetting: <T extends keyof SeismicLayer["settings"]>(setting: T, value: SeismicLayer["settings"][T]) => void;
};

export const SeismicLayerSettings: React.FC<SeismicLayerSettingsProps> = (props) => {
    const availableSeismicAttributes = useAtomValue(availableSeismicAttributesAtom);
    const availableSeismicDateOrIntervalStrings = useAtomValue(availableSeismicDateOrIntervalStringsAtom);
    const seismicCubeMetaList = useAtomValue(seismicCubeMetaListQueryAtom);

    let seismicCubeMetaListErrorMessage = "";
    if (seismicCubeMetaList.isError) {
        seismicCubeMetaListErrorMessage = "Failed to load seismic cube meta list";
    }

    function handleDataTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.updateSetting("dataType", event.target.value as SeismicDataType);
    }

    function handleSurveyTypeChange(event: React.ChangeEvent<HTMLInputElement>) {
        props.updateSetting("surveyType", event.target.value as SeismicSurveyType);
    }

    function handleAttributeChange(selected: string) {
        props.updateSetting("attribute", selected);
    }

    function handleDateOrIntervalChange(selected: string) {
        props.updateSetting("dateOrInterval", selected);
    }

    return (
        <div className="table text-sm border-spacing-1">
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
                        value={props.layer.settings.dataType}
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
                        value={props.layer.settings.surveyType}
                        onChange={handleSurveyTypeChange}
                        direction="horizontal"
                    />
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Attribute</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={seismicCubeMetaList.isFetching}
                        errorMessage={seismicCubeMetaListErrorMessage}
                    >
                        <Dropdown
                            options={makeAttributeOptions(availableSeismicAttributes)}
                            value={props.layer.settings.attribute ?? undefined}
                            onChange={handleAttributeChange}
                        />
                    </PendingWrapper>
                </div>
            </div>
            <div className="table-row">
                <div className="table-cell">Date or interval</div>
                <div className="table-cell">
                    <PendingWrapper
                        isPending={seismicCubeMetaList.isFetching}
                        errorMessage={seismicCubeMetaListErrorMessage}
                    >
                        <Dropdown
                            options={makeDateOrIntervalStringOptions(availableSeismicDateOrIntervalStrings)}
                            value={props.layer.settings.dateOrInterval ?? undefined}
                            onChange={handleDateOrIntervalChange}
                        />
                    </PendingWrapper>
                </div>
            </div>
        </div>
    );
};

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
