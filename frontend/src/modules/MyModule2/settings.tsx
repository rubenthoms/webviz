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
import { Select } from "@lib/components/Select";
import { Switch } from "@lib/components/Switch";
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
    const [wellbore, setWellbore] = props.moduleContext.useStoreState("wellbore");
    const [surfaceAttribute, setSurfaceAttribute] = props.moduleContext.useStoreState("surfaceAttribute");
    const [surfaceNames, setSurfaceNames] = props.moduleContext.useStoreState("surfaceNames");
    const [grid, setGrid] = props.moduleContext.useStoreState("grid");
    const [showWellbore, setShowWellbore] = props.moduleContext.useStoreState("showWellbore");
    const [geoModel, setGeoModel] = props.moduleContext.useStoreState("geoModel");
    const [geoModelLabels, setGeoModelLabels] = props.moduleContext.useStoreState("geoModelLabels");
    const [seismic, setSeismic] = props.moduleContext.useStoreState("seismic");
    const [schematic, setSchematic] = props.moduleContext.useStoreState("schematic");
    const [seaAndRbk, setSeaAndRbk] = props.moduleContext.useStoreState("seaAndRbk");
    const [picks, setPicks] = props.moduleContext.useStoreState("picks");
    const [axisLabels, setAxisLabels] = props.moduleContext.useStoreState("axisLabels");
    const [polyLineIntersection, setPolyLineIntersection] = props.moduleContext.useStoreState("polyLineIntersection");

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

    function handleGridChange() {
        setGrid(!grid);
    }

    function handleEnsembleSelectionChange(ensembleIdent: EnsembleIdent | null) {
        setEnsembleIdent(ensembleIdent);
    }

    function handleRealizationsChange(values: string[]) {
        setRealizations(values.map((v) => parseInt(v)));
    }

    function handleWellboreChange(wellboreUuids: string[]) {
        const wellbores = wellboreUuids.map((uuid) => availableWellboreList.find((w) => w.uuid === uuid));
        setWellbore(wellbores[0] ?? null);
    }

    function handleSurfaceAttributeChange(values: string[]) {
        setSurfaceAttribute(values[0]);
    }

    function handleSurfaceNamesChange(values: string[]) {
        setSurfaceNames(values);
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
                        value={wellbore?.uuid ? [wellbore.uuid] : []}
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
            <Label text="Show grid">
                <Switch checked={grid} onChange={handleGridChange} />
            </Label>
            <Label text="Show wellbore">
                <Switch checked={showWellbore} onChange={() => setShowWellbore(!showWellbore)} />
            </Label>
            <Label text="Show geo model">
                <Switch checked={geoModel} onChange={() => setGeoModel(!geoModel)} />
            </Label>
            <Label text="Show geo model labels">
                <Switch checked={geoModelLabels} onChange={() => setGeoModelLabels(!geoModelLabels)} />
            </Label>
            <Label text="Show seismic">
                <Switch checked={seismic} onChange={() => setSeismic(!seismic)} />
            </Label>
            <Label text="Show schematic">
                <Switch checked={schematic} onChange={() => setSchematic(!schematic)} />
            </Label>
            <Label text="Show sea and RBK">
                <Switch checked={seaAndRbk} onChange={() => setSeaAndRbk(!seaAndRbk)} />
            </Label>
            <Label text="Show picks">
                <Switch checked={picks} onChange={() => setPicks(!picks)} />
            </Label>
            <Label text="Show axis labels">
                <Switch checked={axisLabels} onChange={() => setAxisLabels(!axisLabels)} />
            </Label>
            <Label text="Show polyline intersection">
                <Switch
                    checked={polyLineIntersection}
                    onChange={() => setPolyLineIntersection(!polyLineIntersection)}
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
