import { EnsembleSetting } from "./EnsembleSetting";
import { SettingType } from "./SettingTypes";

export class LayerSettingFactory {
    static makeSetting(settingType: SettingType) {
        switch (settingType) {
            case SettingType.ENSEMBLE:
                return new EnsembleSetting();
            case SettingType.SURFACE_NAME:
            default:
                throw new Error("Unknown setting type");
        }
    }
}
