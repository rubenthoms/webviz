import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { interfaceInitialization } from "@modules/WellLogViewer/settingsToViewInterface";

import { atomWithQuery } from "jotai-tanstack-query";

import { DEFAULT_OPTIONS } from "../queries/shared";

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    // Getting the settings atom via the interface for clearer seperation
    const wellboreUuid = interfaceInitialization.wellboreHeader(get)?.wellboreUuid ?? "";

    return {
        queryKey: ["getWellTrajectories", wellboreUuid],
        queryFn: () => apiService.well.getWellTrajectories([wellboreUuid]),
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: Boolean(wellboreUuid),
        ...DEFAULT_OPTIONS,
    };
});
