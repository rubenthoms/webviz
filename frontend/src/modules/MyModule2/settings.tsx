import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { RadioGroup } from "@lib/components/RadioGroup";
import { Select, SelectOption } from "@lib/components/Select";
import { ColorSet } from "@lib/utils/ColorSet";
import { useSeismicCubeMetaListQuery } from "@modules/SeismicIntersection/queryHooks";
import { SurfaceDirectory, SurfaceTimeType, useSurfaceDirectoryQuery } from "@modules/_shared/Surface";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import {
    SeismicDataType,
    SeismicDataTypeTypeToStringMapping,
    SeismicTimeTypeEnumToSeismicTimeTypeStringMapping,
    SeismicTimeTypeEnumToSurveyTypeStringMapping,
    State,
    StratigraphyColorMap,
} from "./state";
import { SeismicCubeMetaDirectory, SeismicTimeType } from "./utils/seismicCubeDirectory";

const WELLBORE_TYPE = "smda";

export function Settings(props: ModuleFCProps<State>) {
    const ensembleSet = useEnsembleSet(props.workbenchSession);
    const statusWriter = useSettingsStatusWriter(props.moduleContext);
    const colorSet = props.workbenchSettings.useColorSet();

    const [ensembleIdent, setEnsembleIdent] = props.moduleContext.useStoreState("ensembleIdent");
    const [realizations, setRealizations] = props.moduleContext.useStoreState("realizations");
    const [wellboreHeader, setWellboreHeader] = props.moduleContext.useStoreState("wellboreHeader");
    const [surfaceAttribute, setSurfaceAttribute] = props.moduleContext.useStoreState("surfaceAttribute");
    const [surfaceNames, setSurfaceNames] = props.moduleContext.useStoreState("surfaceNames");
    const [seismicDataType, setSeismicDataType] = props.moduleContext.useStoreState("seismicDataType");
    const [seismicTimeType, setSeismicTimeType] = props.moduleContext.useStoreState("seismicTimeType");
    const [seismicAttribute, setSeismicAttribute] = props.moduleContext.useStoreState("seismicAttribute");
    const [seismicTimestamp, setSeismicTimestamp] = props.moduleContext.useStoreState("seismicTimestamp");
    const [visibleLayers, setVisibleLayers] = props.moduleContext.useStoreState("visibleLayers");
    const [visibleStatisticCurves, setVisibleStatisticCurves] =
        props.moduleContext.useStoreState("visibleStatisticCurves");

    let availableRealizations: readonly number[] = [];
    if (ensembleIdent) {
        availableRealizations = ensembleSet.findEnsemble(ensembleIdent)?.getRealizations() ?? [];
    }

    const wellHeadersQuery = useWellHeadersQuery(ensembleIdent?.getCaseUuid());
    const surfaceDirectoryQuery = useSurfaceDirectoryQuery(
        ensembleIdent?.getCaseUuid(),
        ensembleIdent?.getEnsembleName()
    );
    if (wellHeadersQuery.isError) {
        statusWriter.addError("Error loading well headers");
    }
    if (surfaceDirectoryQuery.isError) {
        statusWriter.addError("Error loading surface directory");
    }

    const availableWellboreList: Wellbore[] =
        wellHeadersQuery.data?.map((wellbore) => ({
            type: WELLBORE_TYPE,
            uwi: wellbore.unique_wellbore_identifier,
            uuid: wellbore.wellbore_uuid,
        })) || [];

    const surfaceDirectory = surfaceDirectoryQuery.data
        ? new SurfaceDirectory({
              surfaceMetas: surfaceDirectoryQuery.data,
              timeType: SurfaceTimeType.None,
              includeAttributeTypes: [SurfaceAttributeType_api.DEPTH],
          })
        : null;

    const surfaceAttrOptions = surfaceDirectory
        ? surfaceDirectory.getAttributeNames(null).map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];

    const availableSurfaceNames = surfaceDirectory ? surfaceDirectory.getSurfaceNames(surfaceAttribute) : null;

    const seismicCubeMetaListQuery = useSeismicCubeMetaListQuery(
        ensembleIdent?.getCaseUuid(),
        ensembleIdent?.getEnsembleName()
    );

    // Create seismic cube directory
    const seismicCubeMetaDirectory = seismicCubeMetaListQuery.data
        ? new SeismicCubeMetaDirectory({
              seismicCubeMetaList: seismicCubeMetaListQuery.data,
              timeType: seismicTimeType,
              useObservedSeismicCubes: seismicDataType === SeismicDataType.OBSERVED,
          })
        : null;

    const seismicAttributeOptions = seismicCubeMetaDirectory
        ? seismicCubeMetaDirectory.getAttributeNames().map((attribute) => {
              return { label: attribute, value: attribute };
          })
        : [];
    const seismicTimeOptions = seismicCubeMetaDirectory
        ? createOptionsFromTimeOrIntervalStrings(seismicCubeMetaDirectory.getTimeOrIntervalStrings())
        : [];

    React.useEffect(function propogateColorsToView() {
        if (surfaceDirectory && availableSurfaceNames) {
            const surfaceColorMap = createStratigraphyColors(availableSurfaceNames?.sort() ?? [], colorSet);
            props.moduleContext.getStateStore().setValue("stratigraphyColorMap", surfaceColorMap);
        }
    });

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setEnsembleIdent(ensembleIdent);
    }

    function handleRealizationsChange(values: string[]) {
        setRealizations(values.map((v) => parseInt(v)));
    }

    function handleWellboreChange(wellboreUuids: string[]) {
        const wellboreId = wellboreUuids.map((uuid) => availableWellboreList.find((w) => w.uuid === uuid))[0] ?? null;
        const wellboreHeader = wellHeadersQuery.data?.find((w) => w.wellbore_uuid === wellboreId?.uuid) ?? null;
        setWellboreHeader(wellboreHeader ?? null);
    }

    function handleSurfaceAttributeChange(values: string[]) {
        setSurfaceAttribute(values[0]);
    }

    function handleSurfaceNamesChange(values: string[]) {
        setSurfaceNames(values);
    }

    function handleLayerVisibilityChange(values: string[]) {
        setVisibleLayers(values);
    }

    function handleStatisticCurvesVisibilityChange(values: string[]) {
        const newValue = {
            mean: values.includes("mean"),
            minMax: values.includes("minMax"),
            p10p90: values.includes("p10p90"),
            p50: values.includes("p50"),
        };
        setVisibleStatisticCurves(newValue);
    }

    function handleSeismicAttributeChange(values: string[]) {
        setSeismicAttribute(values[0]);
    }

    function handleSeismicTimeChange(values: string[]) {
        setSeismicTimestamp(values[0]);
    }

    return (
        <div className="flex flex-col gap-2">
            <CollapsibleGroup title="Ensemble & realizations" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Ensemble">
                        <SingleEnsembleSelect
                            ensembleSet={ensembleSet}
                            value={ensembleIdent}
                            onChange={handleEnsembleSelectionChange}
                        />
                    </Label>
                    <Label text="Realizations">
                        <Select
                            multiple
                            options={availableRealizations.map((r) => ({ value: r.toString(), label: r.toString() }))}
                            value={realizations.map((r) => r.toString())}
                            onChange={handleRealizationsChange}
                            size={5}
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Well trajectory" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Well trajectory">
                        <QueryStateWrapper
                            queryResult={wellHeadersQuery}
                            errorComponent={"Error loading wells"}
                            loadingComponent={<CircularProgress />}
                        >
                            <Select
                                multiple
                                options={availableWellboreList.map((w) => ({ value: w.uuid, label: w.uwi }))}
                                value={wellboreHeader?.wellbore_uuid ? [wellboreHeader.wellbore_uuid] : []}
                                onChange={handleWellboreChange}
                                size={5}
                            />
                        </QueryStateWrapper>
                    </Label>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Surface attribute & name" expanded>
                <QueryStateWrapper
                    queryResult={surfaceDirectoryQuery}
                    errorComponent={"Error loading seismic directory"}
                    loadingComponent={<CircularProgress />}
                >
                    <div className="flex flex-col gap-2">
                        <Label text="Surface attribute">
                            <Select
                                options={surfaceAttrOptions}
                                value={surfaceAttribute ? [surfaceAttribute] : []}
                                size={5}
                                onChange={handleSurfaceAttributeChange}
                            />
                        </Label>
                        <Label text="Surface names">
                            <Select
                                options={availableSurfaceNames?.map((name) => ({ label: name, value: name })) || []}
                                onChange={handleSurfaceNamesChange}
                                value={surfaceNames || []}
                                size={5}
                                multiple={true}
                            />
                        </Label>
                    </div>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup title="Seismic specifications">
                <div className="flex flex-col gap-4 overflow-y-auto">
                    <Label text="Seismic data type">
                        <RadioGroup
                            direction="horizontal"
                            options={Object.values(SeismicDataType).map((val: SeismicDataType) => {
                                return { value: val, label: SeismicDataTypeTypeToStringMapping[val] };
                            })}
                            value={seismicDataType}
                            onChange={(_, value: string | number) => setSeismicDataType(value as SeismicDataType)}
                        />
                    </Label>
                    <Label text="Seismic survey type">
                        <RadioGroup
                            options={Object.values(SeismicTimeType).map((val: SeismicTimeType) => {
                                return { value: val, label: SeismicTimeTypeEnumToSurveyTypeStringMapping[val] };
                            })}
                            direction="horizontal"
                            value={seismicTimeType}
                            onChange={(_, value: string | number) => setSeismicTimeType(value as SeismicTimeType)}
                        />
                    </Label>
                    <QueryStateWrapper
                        queryResult={seismicCubeMetaListQuery}
                        errorComponent={"Error loading seismic directory"}
                        loadingComponent={<CircularProgress />}
                    >
                        <div className="flex flex-col gap-4 overflow-y-auto">
                            <Label text="Seismic attribute">
                                <Select
                                    options={seismicAttributeOptions}
                                    value={seismicAttribute ? [seismicAttribute] : []}
                                    size={5}
                                    onChange={handleSeismicAttributeChange}
                                />
                            </Label>
                            <Label text={SeismicTimeTypeEnumToSeismicTimeTypeStringMapping[seismicTimeType]}>
                                <Select
                                    options={seismicTimeOptions}
                                    value={seismicTimestamp ? [seismicTimestamp] : []}
                                    onChange={handleSeismicTimeChange}
                                    size={8}
                                />
                            </Label>
                        </div>
                    </QueryStateWrapper>
                </div>
            </CollapsibleGroup>
            <CollapsibleGroup title="Visibility" expanded>
                <div className="flex flex-col gap-2">
                    <Label text="Visible layers">
                        <Select
                            options={makeLayerOptions()}
                            value={visibleLayers}
                            size={5}
                            onChange={handleLayerVisibilityChange}
                            multiple
                        />
                    </Label>
                    <Label text="Visible statistic curves">
                        <Select
                            options={makeStatisticCurveOptions()}
                            value={
                                Object.entries(visibleStatisticCurves)
                                    .map(([el, value]) => (value ? el : null))
                                    .filter((el) => el !== null) as string[]
                            }
                            size={5}
                            onChange={handleStatisticCurvesVisibilityChange}
                            multiple
                        />
                    </Label>
                </div>
            </CollapsibleGroup>
        </div>
    );
}

function createStratigraphyColors(surfaceNames: string[], colorSet: ColorSet): StratigraphyColorMap {
    const colorMap: StratigraphyColorMap = {};
    surfaceNames.forEach((surfaceName, index) => {
        colorMap[surfaceName] = index === 0 ? colorSet.getFirstColor() : colorSet.getNextColor();
    });
    return colorMap;
}

function makeLayerOptions(): SelectOption[] {
    return [
        { label: "Grid", value: "grid" },
        { label: "Wellbore", value: "wellborepath" },
        { label: "Geo model", value: "geomodel" },
        { label: "Geo model labels", value: "geomodel-labels" },
        { label: "Seismic", value: "seismic" },
        { label: "Schematic", value: "schematic" },
        { label: "Sea and RKB", value: "sea-and-rkb" },
        { label: "Picks", value: "picks" },
        { label: "Axis labels", value: "axis-labels" },
        { label: "Polyline intersection", value: "polyline-intersection" },
    ];
}

function makeStatisticCurveOptions(): SelectOption[] {
    return [
        { label: "Mean", value: "mean" },
        { label: "Min/Max", value: "minMax" },
        { label: "P10/P90", value: "p10p90" },
        { label: "P50", value: "p50" },
    ];
}

function createOptionsFromTimeOrIntervalStrings(timeOrIntervalStrings: string[]): SelectOption[] {
    if (timeOrIntervalStrings.length == 0) {
        return [];
    }

    // '2018-01-01T00:00:00.000/2019-07-01T00:00:00.000' to '2018-01-01/2019-07-01'
    const options = timeOrIntervalStrings.map((elm) => {
        const isInterval = elm.includes("/");
        return { value: elm, label: isInterval ? isoIntervalStringToDateLabel(elm) : isoStringToDateLabel(elm) };
    });
    return options;
}

/**
 * Extracts the date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00.000'
 * Returns: '2018-01-01'
 */
function isoStringToDateLabel(inputIsoString: string): string {
    const date = inputIsoString.split("T")[0];
    return `${date}`;
}

/**
 * Extracts interval date substring from an ISO string
 *
 * Input ISO string format: '2018-01-01T00:00:00.000/2019-07-01T00:00:00.000'
 * Returns: '2018-01-01/2019-07-01'
 */
function isoIntervalStringToDateLabel(inputIsoIntervalString: string): string {
    const [start, end] = inputIsoIntervalString.split("/");
    const startDate = start.split("T")[0];
    const endDate = end.split("T")[0];
    return `${startDate}/${endDate}`;
}
