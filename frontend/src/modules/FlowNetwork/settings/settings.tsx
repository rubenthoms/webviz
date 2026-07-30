import React from "react";

import { useAtom, useAtomValue } from "jotai";

import { NodeType_api, Frequency_api } from "@api";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";
import type { ModuleSettingsProps } from "@framework/Module";
import type { RegularEnsembleIdent } from "@framework/RegularEnsembleIdent";
import { useSettingsStatusWriter } from "@framework/StatusWriter";
import { useEnsembleRealizationFilterFunc, useEnsembleSet } from "@framework/WorkbenchSession";
import { Combobox } from "@lib/components/Combobox";
import { Select } from "@lib/components/Select";
import { Setting } from "@lib/components/Setting";
import { TextInput } from "@lib/components/TextInput";
import {
    TimelineAutoplayButton,
    TimelineAutoplayDelaySelect,
    TimelineAutoplayLoopToggle,
    TimelineEventSelector,
    useTimelineAutoplay,
} from "@lib/components/TimelineEventSelector";
import type { TimelineEvent } from "@lib/components/TimelineEventSelector";
import { useMakePersistableFixableAtomAnnotations } from "@modules/_shared/hooks/useMakePersistableFixableAtomAnnotations";
import { usePropagateQueryErrorToStatusWriter } from "@modules/_shared/hooks/usePropagateApiErrorToStatusWriter";

import type { Interfaces } from "../interfaces";
import { FrequencyEnumToStringMapping, NodeTypeEnumToStringMapping } from "../types";

import { selectedNodeTypesAtom, selectedResamplingFrequencyAtom } from "./atoms/baseAtoms";
import {
    availableDateTimesAtom,
    availableRealizationsAtom,
    availableTreeTypesAtom,
    edgeMetadataListAtom,
    nodeMetadataListAtom,
} from "./atoms/derivedAtoms";
import {
    selectedDateTimeAtom,
    selectedEdgeKeyAtom,
    selectedEnsembleIdentAtom,
    selectedNodeKeyAtom,
    selectedRealizationAtom,
    selectedTreeTypeAtom,
} from "./atoms/persistableFixableAtoms";
import { realizationFlowNetworkQueryAtom } from "./atoms/queryAtoms";

export function Settings({ workbenchSession, settingsContext }: ModuleSettingsProps<Interfaces>) {
    const ensembleSet = useEnsembleSet(workbenchSession);
    const statusWriter = useSettingsStatusWriter(settingsContext);

    const availableRealizations = useAtomValue(availableRealizationsAtom);
    const availableTreeTypes = useAtomValue(availableTreeTypesAtom);
    const availableDateTimes = useAtomValue(availableDateTimesAtom);
    const edgeMetadataList = useAtomValue(edgeMetadataListAtom);
    const nodeMetadataList = useAtomValue(nodeMetadataListAtom);

    const [selectedResamplingFrequency, setSelectedResamplingFrequency] = useAtom(selectedResamplingFrequencyAtom);
    const [selectedNodeTypes, setSelectedNodeTypes] = useAtom(selectedNodeTypesAtom);
    const [selectedTreeType, setSelectedTreeType] = useAtom(selectedTreeTypeAtom);

    const [selectedEdgeKey, setSelectedEdgeKey] = useAtom(selectedEdgeKeyAtom);
    const [selectedNodeKey, setSelectedNodeKey] = useAtom(selectedNodeKeyAtom);
    const [selectedEnsembleIdent, setSelectedEnsembleIdent] = useAtom(selectedEnsembleIdentAtom);
    const [selectedRealization, setSelectedRealization] = useAtom(selectedRealizationAtom);
    const [selectedDateTime, setSelectedDateTime] = useAtom(selectedDateTimeAtom);

    const flowNetworkQuery = useAtomValue(realizationFlowNetworkQueryAtom);

    usePropagateQueryErrorToStatusWriter(flowNetworkQuery, statusWriter);

    const ensembleRealizationFilterFunction = useEnsembleRealizationFilterFunc(workbenchSession);
    const timeStepDebounceTimeMs = 10;
    const timeStepDebounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (timeStepDebounceTimerRef.current) {
            clearTimeout(timeStepDebounceTimerRef.current);
        }
    });

    function handleEnsembleSelectionChange(ensembleIdent: RegularEnsembleIdent | null) {
        setSelectedEnsembleIdent(ensembleIdent);
    }

    function handleSelectedDateTimeChange(dateTime: string | null) {
        if (timeStepDebounceTimerRef.current) {
            clearTimeout(timeStepDebounceTimerRef.current);
        }

        timeStepDebounceTimerRef.current = setTimeout(() => {
            setSelectedDateTime(dateTime);
        }, timeStepDebounceTimeMs);
    }

    // The event's own id is the date string itself, so selection round-trips without an index lookup.
    // A bare "YYYY-MM-DD" string parses as UTC midnight, which can display as the wrong calendar day
    // depending on the browser's timezone offset - appending a bare time forces local-time parsing
    // instead. Left as-is for strings that already carry a time/offset component.
    const dateTimeEvents: TimelineEvent[] = React.useMemo(
        () =>
            availableDateTimes.map((dateTime) => ({
                id: dateTime,
                timestamp: new Date(dateTime.includes("T") ? dateTime : `${dateTime}T00:00:00`),
                label: dateTime,
            })),
        [availableDateTimes],
    );

    const [timeStepAutoplayLoop, setTimeStepAutoplayLoop] = React.useState(false);
    const [timeStepAutoplayDelayMs, setTimeStepAutoplayDelayMs] = React.useState(3000);
    const timeStepAutoplay = useTimelineAutoplay({
        events: dateTimeEvents,
        selectedEventId: selectedDateTime.value,
        onSelectedEventChange: handleSelectedDateTimeChange,
        delayMs: timeStepAutoplayDelayMs,
        loop: timeStepAutoplayLoop,
    });

    const selectedEnsembleIdentAnnotations = useMakePersistableFixableAtomAnnotations(selectedEnsembleIdentAtom);
    const selectedTreeTypeAnnotations = useMakePersistableFixableAtomAnnotations(selectedTreeTypeAtom);
    const selectedRealizationAnnotations = useMakePersistableFixableAtomAnnotations(selectedRealizationAtom);
    const selectedEdgeKeyAnnotations = useMakePersistableFixableAtomAnnotations(selectedEdgeKeyAtom);
    const selectedNodeKeyAnnotations = useMakePersistableFixableAtomAnnotations(selectedNodeKeyAtom);
    const selectedDateTimeAnnotations = useMakePersistableFixableAtomAnnotations(selectedDateTimeAtom);

    return (
        <Setting.ScrollArea>
            <Setting.Panel>
                <Setting.Section title="Data" defaultOpen>
                    <Setting.Field label="Ensembles" annotations={selectedEnsembleIdentAnnotations}>
                        <EnsembleDropdown
                            ensembles={ensembleSet.getRegularEnsembleArray()}
                            value={selectedEnsembleIdent.value}
                            ensembleRealizationFilterFunction={ensembleRealizationFilterFunction}
                            onValueChange={handleEnsembleSelectionChange}
                        />
                    </Setting.Field>
                    <Setting.Field label="Realization" annotations={selectedRealizationAnnotations}>
                        <Combobox
                            items={availableRealizations.map((real) => {
                                return { value: real, label: real.toString() };
                            })}
                            value={selectedRealization.value}
                            onValueChange={setSelectedRealization}
                        />
                    </Setting.Field>
                    <Setting.Field label="Frequency">
                        <Combobox
                            items={Object.values(Frequency_api).map((val: Frequency_api) => {
                                return { value: val, label: FrequencyEnumToStringMapping[val] };
                            })}
                            value={selectedResamplingFrequency}
                            onValueChange={(v) => v && setSelectedResamplingFrequency(v)}
                        />
                    </Setting.Field>
                    <Setting.Field label="Node Types">
                        <Select
                            options={Object.values(NodeType_api).map((val: NodeType_api) => {
                                return { value: val, label: NodeTypeEnumToStringMapping[val] };
                            })}
                            value={Array.from(selectedNodeTypes)}
                            onValueChange={(v) => setSelectedNodeTypes(new Set(v))}
                            size={3}
                            multiple
                        />
                    </Setting.Field>
                </Setting.Section>
                <Setting.Section title="Network" defaultOpen>
                    <Setting.Field
                        label="Tree Type"
                        loadingOverlay={selectedTreeType.isLoading}
                        errorOverlay={selectedTreeType.depsHaveError ? "Could not load tree types." : undefined}
                        annotations={selectedTreeTypeAnnotations}
                    >
                        <Combobox
                            items={availableTreeTypes.map((type) => {
                                return { value: type, label: type };
                            })}
                            value={selectedTreeType.value ?? null}
                            onValueChange={(v) => v && setSelectedTreeType(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Edge options"
                        annotations={selectedEdgeKeyAnnotations}
                        loadingOverlay={selectedEdgeKey.isLoading}
                        errorOverlay={selectedEdgeKey.depsHaveError ? "Could not load edges." : undefined}
                    >
                        <Combobox
                            placeholder={!edgeMetadataList.length ? "No edge data available" : ""}
                            disabled={!edgeMetadataList.length}
                            items={edgeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedEdgeKey.value ?? null}
                            onValueChange={(v) => v && setSelectedEdgeKey(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Node options"
                        annotations={selectedNodeKeyAnnotations}
                        loadingOverlay={selectedNodeKey.isLoading}
                        errorOverlay={selectedNodeKey.depsHaveError ? "Could not load nodes." : undefined}
                    >
                        <Combobox
                            placeholder={!nodeMetadataList.length ? "No node data available" : ""}
                            disabled={!nodeMetadataList.length}
                            items={nodeMetadataList.map((item) => {
                                return { label: item.label, value: item.key };
                            })}
                            value={selectedNodeKey.value ?? null}
                            onValueChange={(v) => v && setSelectedNodeKey(v)}
                        />
                    </Setting.Field>
                    <Setting.Field
                        label="Time step"
                        loadingOverlay={selectedDateTime.isLoading}
                        annotations={selectedDateTimeAnnotations}
                        errorOverlay={selectedDateTime.depsHaveError ? "Could not load time steps." : undefined}
                    >
                        <div className="gap-sm flex flex-col">
                            <TimelineEventSelector
                                layoutClassName="w-full"
                                size="small"
                                disabled={!availableDateTimes.length}
                                events={dateTimeEvents}
                                selectedEventId={selectedDateTime.value}
                                onSelectedEventChange={handleSelectedDateTimeChange}
                                extraControls={
                                    <>
                                        <TimelineAutoplayDelaySelect
                                            size="small"
                                            disabled={!availableDateTimes.length}
                                            delayMs={timeStepAutoplayDelayMs}
                                            onDelayChange={setTimeStepAutoplayDelayMs}
                                        />
                                        <TimelineAutoplayButton
                                            size="small"
                                            disabled={!availableDateTimes.length}
                                            isPlaying={timeStepAutoplay.isPlaying}
                                            onToggle={timeStepAutoplay.toggle}
                                        />
                                        <TimelineAutoplayLoopToggle
                                            size="small"
                                            disabled={!availableDateTimes.length}
                                            loop={timeStepAutoplayLoop}
                                            onToggle={() => setTimeStepAutoplayLoop((l) => !l)}
                                        />
                                    </>
                                }
                            />
                            <TextInput
                                value={selectedDateTime.value ?? ""}
                                placeholder="No time step selected"
                                size="small"
                                readOnly
                            />
                        </div>
                    </Setting.Field>
                </Setting.Section>
            </Setting.Panel>
        </Setting.ScrollArea>
    );
}
