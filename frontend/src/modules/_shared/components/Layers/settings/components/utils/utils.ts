import { isEqual } from "lodash";

export function fixupSetting<TSetting>(setting: TSetting, validOptions: readonly TSetting[]): TSetting {
    if (validOptions.length === 0) {
        return setting;
    }

    if (!validOptions.some((el) => isEqual(el, setting)) || setting === null) {
        return validOptions[0];
    }

    return setting;
}
