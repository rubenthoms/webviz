import React from "react";

import { EnsembleSet } from "@framework/EnsembleSet";
import { ModuleSettingsProps } from "@framework/Module";
import { WorkbenchSession, useEnsembleSet } from "@framework/WorkbenchSession";
import { WorkbenchSettings } from "@framework/WorkbenchSettings";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";
import { LayersPanel } from "@modules/_shared/components/Layers";
import { BaseLayer } from "@modules/_shared/layers/BaseLayer";

import { useAtomValue, useSetAtom } from "jotai";

import { userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { filteredEnsembleSetAtom, layerManagerAtom, selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { SurfaceLayerSettingsComponent } from "./components/layerSettings/surfaceLayer";
import { WellboreLayerSettingsComponent } from "./components/layerSettings/wellboreLayer";

import { LayerFactory } from "../layers/LayerFactory";
import { isSurfaceLayer } from "../layers/SurfaceLayer";
import { isWellboreLayer } from "../layers/WellboreLayer";
import { LAYER_TYPE_TO_STRING_MAPPING } from "../layers/types";
import { SettingsToViewInterface } from "../settingsToViewInterface";
import { State } from "../state";

export function Settings(props: ModuleSettingsProps<State, SettingsToViewInterface>): React.ReactNode {
    const ensembleSet = useEnsembleSet(props.workbenchSession);

    const selectedFieldIdentifier = useAtomValue(selectedFieldIdentifierAtom);
    const setSelectedFieldIdentifier = useSetAtom(userSelectedFieldIdentifierAtom);

    const filteredEnsembleSet = useAtomValue(filteredEnsembleSetAtom);

    const layerManager = useAtomValue(layerManagerAtom);

    function handleFieldIdentifierChange(fieldIdentifier: string | null) {
        setSelectedFieldIdentifier(fieldIdentifier);
    }

    return (
        <div className="flex flex-col gap-2 h-full">
            <CollapsibleGroup title="Field" expanded>
                <FieldDropdown
                    ensembleSet={ensembleSet}
                    value={selectedFieldIdentifier}
                    onChange={handleFieldIdentifierChange}
                />
            </CollapsibleGroup>
            <div className="flex-grow flex flex-col min-h-0">
                <LayersPanel
                    ensembleSet={filteredEnsembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layerManager={layerManager}
                    layerFactory={LayerFactory}
                    layerTypeToStringMapping={LAYER_TYPE_TO_STRING_MAPPING}
                    makeSettingsContainerFunc={makeSettingsContainer}
                    allowGroups
                    groupDefaultName="View"
                />
            </div>
        </div>
    );
}

function makeSettingsContainer(
    layer: BaseLayer<any, any>,
    ensembleSet: EnsembleSet,
    workbenchSession: WorkbenchSession,
    workbenchSettings: WorkbenchSettings
): React.ReactNode {
    if (isSurfaceLayer(layer)) {
        return (
            <SurfaceLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    if (isWellboreLayer(layer)) {
        return (
            <WellboreLayerSettingsComponent
                ensembleSet={ensembleSet}
                workbenchSession={workbenchSession}
                workbenchSettings={workbenchSettings}
                layer={layer}
            />
        );
    }
    return null;
}
