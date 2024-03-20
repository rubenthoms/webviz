import React from "react";

import { SurfaceAttributeType_api } from "@api";
import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { Wellbore } from "@framework/Wellbore";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { SingleEnsembleSelect } from "@framework/components/SingleEnsembleSelect";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { ColorSet } from "@lib/utils/ColorSet";
import { SurfaceDirectory, SurfaceTimeType, useSurfaceDirectoryQuery } from "@modules/_shared/Surface";
import { useWellHeadersQuery } from "@modules/_shared/WellBore";

import { State, StratigraphyColorMap } from "./state";

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

    return (
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
                    size={10}
                />
            </Label>
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
                        size={10}
                    />
                </QueryStateWrapper>
            </Label>
            <QueryStateWrapper
                queryResult={surfaceDirectoryQuery}
                errorComponent={"Error loading seismic directory"}
                loadingComponent={<CircularProgress />}
            >
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
            </QueryStateWrapper>
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
