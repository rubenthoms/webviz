import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { LayerManager } from "@modules_shared/layers/LayerManager";

import { layerManagerAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    layerManager: LayerManager;
};

export type Interfaces = {
    settingsToView: SettingsToViewInterface;
};

export const settingsToViewInterfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    layerManager: (get) => {
        return get(layerManagerAtom);
    },
};
