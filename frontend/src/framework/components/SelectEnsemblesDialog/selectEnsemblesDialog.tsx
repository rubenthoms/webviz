import React from "react";

import { CaseInfo, EnsembleInfo, FieldInfo } from "@api";
import { apiService } from "@framework/ApiService";
import { Workbench } from "@framework/Workbench";
import { WorkbenchSessionEvent } from "@framework/WorkbenchSession";
import { CheckIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { ApiStateWrapper } from "@lib/components/ApiStateWrapper";
import { Button } from "@lib/components/Button";
import { CircularProgress } from "@lib/components/CircularProgress";
import { Dialog } from "@lib/components/Dialog";
import { Dropdown } from "@lib/components/Dropdown";
import { IconButton } from "@lib/components/IconButton";
import { Label } from "@lib/components/Label";
import { Select } from "@lib/components/Select";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { isEqual } from "lodash";

export type EnsembleItem = {
    caseUuid: string;
    caseName: string;
    ensembleName: string;
};

export type SelectEnsemblesDialogProps = {
    open: boolean;
    onClose: () => void;
    workbench: Workbench;
};

export const SelectEnsemblesDialog: React.FC<SelectEnsemblesDialogProps> = (props) => {
    const [confirmCancel, setConfirmCancel] = React.useState<boolean>(false);
    const [selectedField, setSelectedField] = React.useState<string>("");
    const [selectedCaseId, setSelectedCaseId] = React.useState<string>("");
    const [selectedEnsembleName, setSelectedEnsembleName] = React.useState<string>("");
    const [originallySelectedEnsembles, setOriginallySelectedEnsembles] = React.useState<EnsembleItem[]>([]);
    const [newlySelectedEnsembles, setNewlySelectedEnsembles] = React.useState<EnsembleItem[]>([]);

    // Is this the best way to get hold of the QueryClient
    // Revisit this when we refactor the ensemble selection dialog
    const queryClient = useQueryClient();

    const fieldsQuery = useQuery({
        queryKey: ["getFields"],
        queryFn: () => {
            return apiService.explore.getFields();
        },
    });

    const computedFieldIdentifier = fixupFieldIdentifier(selectedField, fieldsQuery.data);

    const casesQuery = useQuery({
        queryKey: ["getCases", computedFieldIdentifier],
        queryFn: () => {
            if (!computedFieldIdentifier) {
                return Promise.resolve<CaseInfo[]>([]);
            }
            return apiService.explore.getCases(computedFieldIdentifier);
        },
        enabled: fieldsQuery.isSuccess,
    });

    const computedCaseUuid = fixupCaseUuid(selectedCaseId, casesQuery.data);

    const ensemblesQuery = useQuery({
        queryKey: ["getEnsembles", computedCaseUuid],
        queryFn: () => {
            if (!computedCaseUuid) {
                return Promise.resolve<EnsembleInfo[]>([]);
            }
            return apiService.explore.getEnsembles(computedCaseUuid);
        },
        enabled: casesQuery.isSuccess,
    });

    React.useEffect(() => {
        const handleEnsemblesChanged = () => {
            const ensArr = props.workbench.getWorkbenchSession().getEnsembleSet().getEnsembleArr();
            const newSelection = ensArr.map((ens) => {
                return {
                    caseUuid: ens.getCaseUuid(),
                    caseName: ens.getCaseName(),
                    ensembleName: ens.getEnsembleName(),
                };
            });
            setOriginallySelectedEnsembles(newSelection);
            setNewlySelectedEnsembles(newSelection);
        };

        const unsubscribeFunc = props.workbench
            .getWorkbenchSession()
            .subscribe(WorkbenchSessionEvent.EnsembleSetChanged, handleEnsemblesChanged);

        return unsubscribeFunc;
    }, [props.workbench]);

    function handleFieldChanged(fieldIdentifier: string) {
        setSelectedField(fieldIdentifier);
    }

    function handleCaseChanged(caseUuids: string[]) {
        setSelectedCaseId(caseUuids[0]);
    }

    function handleEnsembleChanged(ensembleNames: string[]) {
        setSelectedEnsembleName(ensembleNames[0]);
    }

    const computedEnsembleName = fixupEnsembleName(selectedEnsembleName, ensemblesQuery.data);

    function checkIfEnsembleAlreadySelected(): boolean {
        if (computedCaseUuid && computedEnsembleName) {
            if (
                newlySelectedEnsembles.some(
                    (e) => e.caseUuid === computedCaseUuid && e.ensembleName === computedEnsembleName
                )
            ) {
                return true;
            }
        }
        return false;
    }

    function handleAddEnsemble() {
        if (!checkIfEnsembleAlreadySelected()) {
            const caseName = casesQuery.data?.find((c) => c.uuid === computedCaseUuid)?.name ?? "UNKNOWN";
            const ensArr = [{ caseUuid: computedCaseUuid, caseName: caseName, ensembleName: computedEnsembleName }];
            setNewlySelectedEnsembles((prev) => [...prev, ...ensArr]);
        }
    }

    function handleRemoveEnsemble(caseUuid: string, ensembleName: string) {
        setNewlySelectedEnsembles((prev) => [
            ...prev.filter((e) => e.caseUuid !== caseUuid || e.ensembleName !== ensembleName),
        ]);
    }

    function handleClose() {
        setConfirmCancel(false);
        setNewlySelectedEnsembles(originallySelectedEnsembles);
        props.onClose();
    }

    function handleCancel() {
        if (isEqual(originallySelectedEnsembles, newlySelectedEnsembles)) {
            handleClose();
            return;
        }
        setConfirmCancel(true);
    }

    function handleApplyEnsembleSelection() {
        props.workbench.loadAndSetupEnsembleSetInSession(queryClient, newlySelectedEnsembles);
        props.onClose();
        setOriginallySelectedEnsembles(newlySelectedEnsembles);
    }

    const fieldOpts = fieldsQuery.data?.map((f) => ({ value: f.field_identifier, label: f.field_identifier })) ?? [];
    const caseOpts = casesQuery.data?.map((c) => ({ value: c.uuid, label: c.name })) ?? [];
    const ensembleOpts =
        ensemblesQuery.data?.map((e) => ({ value: e.name, label: `${e.name}  (${e.realization_count} reals)` })) ?? [];

    const ensembleAlreadySelected = checkIfEnsembleAlreadySelected();

    return (
        <>
            <Dialog
                open={props.open}
                onClose={handleCancel}
                title="Select ensembles"
                modal
                width={"75%"}
                actions={
                    <div className="flex gap-4">
                        <Button onClick={handleCancel} color="danger">
                            Discard changes
                        </Button>
                        <Button onClick={handleApplyEnsembleSelection}>Apply changes</Button>
                    </div>
                }
            >
                <div className="flex gap-4 max-w-full">
                    <div className="flex flex-col gap-4 p-4 border-r bg-slate-100 h-full">
                        <Label text="Field">
                            <ApiStateWrapper
                                apiResult={fieldsQuery}
                                errorComponent={<div className="text-red-500">Error loading fields</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Dropdown
                                    options={fieldOpts}
                                    value={computedFieldIdentifier}
                                    onChange={handleFieldChanged}
                                    disabled={fieldOpts.length === 0}
                                />
                            </ApiStateWrapper>
                        </Label>
                        <Label text="Case">
                            <ApiStateWrapper
                                apiResult={casesQuery}
                                errorComponent={<div className="text-red-500">Error loading cases</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Select
                                    options={caseOpts}
                                    value={[computedCaseUuid]}
                                    onChange={handleCaseChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width={400}
                                    filter
                                />
                            </ApiStateWrapper>
                        </Label>
                        <Label text="Ensemble">
                            <ApiStateWrapper
                                apiResult={ensemblesQuery}
                                errorComponent={<div className="text-red-500">Error loading ensembles</div>}
                                loadingComponent={<CircularProgress />}
                            >
                                <Select
                                    options={ensembleOpts}
                                    value={[computedEnsembleName]}
                                    onChange={handleEnsembleChanged}
                                    disabled={caseOpts.length === 0}
                                    size={5}
                                    width="100%"
                                />
                            </ApiStateWrapper>
                        </Label>
                        <div className="flex justify-end">
                            <Button
                                variant="contained"
                                onClick={handleAddEnsemble}
                                color={ensembleAlreadySelected ? "success" : "primary"}
                                disabled={ensembleAlreadySelected}
                                startIcon={
                                    ensembleAlreadySelected ? (
                                        <CheckIcon className="w-5 h-5" />
                                    ) : (
                                        <PlusIcon className="w-5 h-5" />
                                    )
                                }
                            >
                                {ensembleAlreadySelected ? "Ensemble already selected" : "Add Ensemble"}
                            </Button>
                        </div>
                    </div>
                    <div className="flex flex-col flex-grow gap-4 p-4">
                        <Label text="Selected Ensembles">
                            <table className="w-full border border-collapse table-fixed">
                                <thead>
                                    <tr>
                                        <th className="min-w-1/2 text-left p-2 bg-slate-300">Case</th>
                                        <th className="min-w-1/4 text-left p-2 bg-slate-300">Ensemble</th>
                                        <th className="w-20 text-left p-2 bg-slate-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {newlySelectedEnsembles.map((item) => (
                                        <tr
                                            key={`${item.caseName}-${item.ensembleName}`}
                                            className="hover:bg-slate-100"
                                        >
                                            <td className="p-2">
                                                <div
                                                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                    title={item.caseName}
                                                >
                                                    {item.caseName}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <div
                                                    className="text-ellipsis overflow-hidden whitespace-nowrap"
                                                    title={item.ensembleName}
                                                >
                                                    {item.ensembleName}
                                                </div>
                                            </td>
                                            <td className="p-2">
                                                <IconButton
                                                    onClick={() =>
                                                        handleRemoveEnsemble(item.caseUuid, item.ensembleName)
                                                    }
                                                    color="danger"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </IconButton>{" "}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Label>
                        {newlySelectedEnsembles.length === 0 && (
                            <div className="text-gray-500">No ensembles selected.</div>
                        )}
                    </div>
                </div>
            </Dialog>
            {
                <Dialog
                    open={confirmCancel}
                    onClose={() => setConfirmCancel(false)}
                    title="Unsaved changes"
                    modal
                    actions={
                        <div className="flex gap-4">
                            <Button onClick={() => setConfirmCancel(false)}>No, don't cancel</Button>
                            <Button onClick={handleClose} color="danger">
                                Yes, cancel
                            </Button>
                        </div>
                    }
                >
                    You have unsaved changes which will be lost. Are you sure you want to cancel?
                </Dialog>
            }
        </>
    );
};

function fixupFieldIdentifier(currFieldIdentifier: string, fieldArr: FieldInfo[] | undefined): string {
    const fieldIdentifiers = fieldArr ? fieldArr.map((item) => item.field_identifier) : [];
    if (currFieldIdentifier && fieldIdentifiers.includes(currFieldIdentifier)) {
        return currFieldIdentifier;
    }

    if (fieldIdentifiers.length > 0) {
        return fieldIdentifiers[0];
    }

    return "";
}

function fixupCaseUuid(currCaseUuid: string, caseArr: CaseInfo[] | undefined): string {
    const caseIds = caseArr ? caseArr.map((item) => item.uuid) : [];
    if (currCaseUuid && caseIds.includes(currCaseUuid)) {
        return currCaseUuid;
    }

    if (caseIds.length > 0) {
        return caseIds[0];
    }

    return "";
}

function fixupEnsembleName(currEnsembleName: string, ensembleArr: EnsembleInfo[] | undefined): string {
    const ensembleNames = ensembleArr ? ensembleArr.map((item) => item.name) : [];
    if (currEnsembleName && ensembleNames.includes(currEnsembleName)) {
        return currEnsembleName;
    }

    if (ensembleNames.length > 0) {
        return ensembleNames[0];
    }

    return "";
}