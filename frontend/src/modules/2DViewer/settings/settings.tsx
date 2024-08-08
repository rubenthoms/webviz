import React from "react";

import { ModuleSettingsProps } from "@framework/Module";
import { useEnsembleSet } from "@framework/WorkbenchSession";
import { FieldDropdown } from "@framework/components/FieldDropdown";
import { CollapsibleGroup } from "@lib/components/CollapsibleGroup";

import { useAtomValue, useSetAtom } from "jotai";

import { userSelectedFieldIdentifierAtom } from "./atoms/baseAtoms";
import { filteredEnsembleSetAtom, layerManagerAtom, selectedFieldIdentifierAtom } from "./atoms/derivedAtoms";
import { Layers } from "./components/layers";

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
                <Layers
                    ensembleSet={filteredEnsembleSet}
                    workbenchSession={props.workbenchSession}
                    workbenchSettings={props.workbenchSettings}
                    layerManager={layerManager}
                />
            </div>
        </div>
    );
}
