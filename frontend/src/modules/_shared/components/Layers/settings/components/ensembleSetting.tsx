import { EnsembleIdent } from "@framework/EnsembleIdent";
import { EnsembleSet } from "@framework/EnsembleSet";
import { EnsembleDropdown } from "@framework/components/EnsembleDropdown";

import { isEqual } from "lodash";

import { fixupSetting } from "./utils/utils";

import { useLayerSettingValue } from "../../../../layers/settings/BaseSetting";
import { EnsembleSetting } from "../../../../layers/settings/EnsembleSetting";

export type EnsembleSettingProps = {
    setting: EnsembleSetting;
    ensembleSet: EnsembleSet;
};

export function EnsembleSettingComponent(props: EnsembleSettingProps): React.ReactNode {
    const ensembleIdent = useLayerSettingValue(props.setting);

    const fixupEnsembleIdent = fixupSetting(
        ensembleIdent,
        props.ensembleSet.getEnsembleArr().map((el) => el.getIdent())
    );
    if (!isEqual(fixupEnsembleIdent, ensembleIdent)) {
        props.setting.setValue(fixupEnsembleIdent);
    }

    function handleEnsembleChange(newEnsembleIdent: EnsembleIdent | null) {
        props.setting.setValue(newEnsembleIdent);
    }

    return (
        <div className="p-1">
            <EnsembleDropdown
                value={ensembleIdent}
                ensembleSet={props.ensembleSet}
                onChange={handleEnsembleChange}
                debounceTimeMs={600}
            />
        </div>
    );
}
