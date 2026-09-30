import { useAtomValue } from "jotai";

import { Source, type PersistableFixableAtom } from "@framework/utils/atomUtils";
import type { SettingAnnotation } from "@lib/components/Setting";

export function useMakePersistableFixableAtomAnnotations(atom: PersistableFixableAtom<any>): SettingAnnotation[] {
    const { isValidInContext, _source, isLoading, depsHaveError } = useAtomValue(atom);

    if (!isValidInContext && _source && !isLoading && !depsHaveError) {
        switch (_source) {
            case Source.PERSISTENCE:
                return [
                    {
                        type: "error",
                        message: "The persisted value is invalid. Please choose a valid value.",
                    },
                ];
            case Source.TEMPLATE:
                return [
                    {
                        type: "error",
                        message: "The template value is invalid. Please choose a valid value.",
                    },
                ];
            case Source.USER:
                return [
                    {
                        type: "error",
                        message: "Your selection is no longer available. Please choose a valid value.",
                    },
                ];
            default:
                return [];
        }
    }

    return [];
}
