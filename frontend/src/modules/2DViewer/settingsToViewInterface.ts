import { InterfaceInitialization } from "@framework/UniDirectionalModuleComponentsInterface";
import { LayerManager } from "@modules_shared/layers/LayerManager";

import { layerManagerAtom } from "./settings/atoms/derivedAtoms";

export type SettingsToViewInterface = {
    layerManager: LayerManager;
};

export const interfaceInitialization: InterfaceInitialization<SettingsToViewInterface> = {
    layerManager: (get) => {
        return get(layerManagerAtom);
    },
};
