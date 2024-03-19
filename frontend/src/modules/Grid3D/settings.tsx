import React from "react";

import { EnsembleIdent } from "@framework/EnsembleIdent";
import { ModuleFCProps } from "@framework/Module";
import { SyncSettingKey, SyncSettingsHelper } from "@framework/SyncSettings";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { fixupEnsembleIdent, maybeAssignFirstSyncedEnsemble } from "@framework/utils/ensembleUiHelpers";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { Input } from "@lib/components/Input";
import { Label } from "@lib/components/Label";
import { QueryStateWrapper } from "@lib/components/QueryStateWrapper";
import { Select, SelectOption } from "@lib/components/Select";
import { useWellHeadersQuery } from "@modules/_shared/WellBore/queryHooks";

import { isEqual } from "lodash";

import { useGridModelInfos } from "./queryHooks";
import state from "./state";

//-----------------------------------------------------------------------------------------------------------
export function Settings({ moduleContext, workbenchServices, workbenchSession }: ModuleFCProps<state>) {
    // From Workbench

    const ensembleSet = useEnsembleSet(workbenchSession);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = React.useState<EnsembleIdent | null>(null);
    // State

    const [singleKLayer, setSingleKLayer] = moduleContext.useStoreState("singleKLayer");
    const [selectedWellUuids, setSelectedWellUuids] = moduleContext.useStoreState("selectedWellUuids");
    const syncedSettingKeys = moduleContext.useSyncedSettingKeys();
    const syncHelper = new SyncSettingsHelper(syncedSettingKeys, workbenchServices);
    const syncedValueEnsembles = syncHelper.useValue(SyncSettingKey.ENSEMBLE, "global.syncValue.ensembles");

    const candidateEnsembleIdent = maybeAssignFirstSyncedEnsemble(selectedEnsembleIdent, syncedValueEnsembles);
    const computedEnsembleIdent = fixupEnsembleIdent(candidateEnsembleIdent, ensembleSet);
    if (computedEnsembleIdent && !computedEnsembleIdent.equals(selectedEnsembleIdent)) {
        setSelectedEnsembleIdent(computedEnsembleIdent);
    }

    const [realization, setRealization] = moduleContext.useStoreState("realization");
    const realizations = computedEnsembleIdent
        ? ensembleSet.findEnsemble(computedEnsembleIdent)?.getRealizations() ?? []
        : [];

    if (realizations.length > 0 && realization === null) {
        setRealization(realizations[0]);
    }

    const gridModelInfosQuery = useGridModelInfos(
        computedEnsembleIdent?.getCaseUuid() ?? null,
        computedEnsembleIdent?.getEnsembleName() ?? null,
        realization
    );

    const [gridName, setGridName] = moduleContext.useStoreState("gridName");
    const [parameterName, setParameterName] = moduleContext.useStoreState("parameterName");
    const [boundingBox, setBoundingBox] = moduleContext.useStoreState("boundingBox");
    const [polyLine, setPolyLine] = moduleContext.useStoreState("polyLine");
    if (!polyLine.length && boundingBox) {
        setPolyLine([boundingBox.xmin, boundingBox.ymin, boundingBox.xmax, boundingBox.ymax]);
    }
    const gridModelNames: string[] = [];
    const parameterNames: string[] = [];
    if (gridModelInfosQuery.data) {
        gridModelInfosQuery.data.forEach((gridModelInfo) => {
            gridModelNames.push(gridModelInfo.grid_name);
        });

        if (gridModelNames.length > 0 && (!gridName || !gridModelNames.includes(gridName))) {
            setGridName(gridModelNames[0]);
        }

        const gridModelInfo = gridName
            ? gridModelInfosQuery.data.find((gridModelInfo) => gridModelInfo.grid_name === gridName)
            : null;
        if (gridModelInfo) {
            if (!isEqual(boundingBox, gridModelInfo.bbox)) {
                setBoundingBox(gridModelInfo.bbox);
            }
            gridModelInfo.property_info_arr.forEach((propInfo) => {
                parameterNames.push(propInfo.property_name);
            });
        }
        if (parameterNames.length > 0 && (!parameterName || !parameterNames.includes(parameterName))) {
            setParameterName(parameterNames[0]);
        }
    }

    const wellHeadersQuery = useWellHeadersQuery(computedEnsembleIdent?.getCaseUuid());
    let wellHeaderOptions: SelectOption[] = [];

    if (wellHeadersQuery.data) {
        wellHeaderOptions = wellHeadersQuery.data.map((header) => ({
            label: header.unique_wellbore_identifier,
            value: header.wellbore_uuid,
        }));
    }

    function handleWellsChange(selectedWellUuids: string[], allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = selectedWellUuids.filter((wellUuid) =>
            allWellUuidsOptions.some((wellHeader) => wellHeader.value === wellUuid)
        );
        setSelectedWellUuids(newSelectedWellUuids);
    }
    function showAllWells(allWellUuidsOptions: SelectOption[]) {
        const newSelectedWellUuids = allWellUuidsOptions.map((wellHeader) => wellHeader.value);

        setSelectedWellUuids(newSelectedWellUuids);
    }
    function hideAllWells() {
        setSelectedWellUuids([]);
    }
    function handleRealizationChange(realizationStrAsArr: string[]) {
        setRealization(parseInt(realizationStrAsArr[0]));
    }
    return (
        <div>
            <CollapsibleGroup expanded={false} title="Realizations">
                <Label text="Realizations">
                    <Select
                        options={realizations.map((realization) => ({
                            label: realization.toString(),
                            value: realization.toString(),
                        }))}
                        value={realization !== null ? [realization.toString()] : ["0"]}
                        onChange={(reals) => handleRealizationChange(reals)}
                        filter={true}
                        size={5}
                        multiple={false}
                    />
                </Label>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Grid data">
                <QueryStateWrapper
                    queryResult={gridModelInfosQuery}
                    errorComponent={"Error loading grid models"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Grid model">
                        <Select
                            options={stringToOptions(gridModelNames)}
                            value={[gridName || gridModelNames[0]]}
                            onChange={(gridnames) => setGridName(gridnames[0])}
                            filter={true}
                            size={5}
                        />
                    </Label>

                    <Label text="Grid parameter">
                        <Select
                            options={stringToOptions(parameterNames || [])}
                            value={[parameterName || parameterNames[0]]}
                            onChange={(pnames) => setParameterName(pnames[0])}
                            filter={true}
                            size={5}
                        />
                    </Label>

                    <Label text="Single K layer">
                        <Input
                            type={"number"}
                            min={-1}
                            max={100}
                            onChange={(e) => setSingleKLayer(parseInt(e.target.value))}
                        />
                    </Label>
                </QueryStateWrapper>
            </CollapsibleGroup>
            <CollapsibleGroup expanded={true} title="Well data">
                <QueryStateWrapper
                    queryResult={wellHeadersQuery}
                    errorComponent={"Error loading wells"}
                    loadingComponent={<CircularProgress />}
                >
                    <Label text="Drilled Wells">
                        <>
                            <div>
                                <Button
                                    className="float-left m-2 text-xs py-0"
                                    variant="outlined"
                                    onClick={() => showAllWells(wellHeaderOptions)}
                                >
                                    Select all
                                </Button>
                                <Button className="m-2 text-xs py-0" variant="outlined" onClick={hideAllWells}>
                                    Select none
                                </Button>
                            </div>
                            <Select
                                options={wellHeaderOptions}
                                value={selectedWellUuids}
                                onChange={(selectedWellUuids: string[]) =>
                                    handleWellsChange(selectedWellUuids, wellHeaderOptions)
                                }
                                size={10}
                                multiple={true}
                            />
                        </>
                    </Label>
                </QueryStateWrapper>
            </CollapsibleGroup>
        </div>
    );
}

const stringToOptions = (strings: string[]): SelectOption[] => {
    return strings.map((string) => ({ label: string, value: string }));
};
