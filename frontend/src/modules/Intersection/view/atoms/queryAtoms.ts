import { WellboreTrajectory_api } from "@api";
import { apiService } from "@framework/ApiService";
import { selectedWellboreUuidAtom } from "@modules/Intersection/sharedAtoms/sharedAtoms";

import { atomWithQuery } from "jotai-tanstack-query";

const STALE_TIME = 60 * 1000;
const CACHE_TIME = 60 * 1000;

export const wellboreTrajectoryQueryAtom = atomWithQuery((get) => {
    const wellboreUuid = get(selectedWellboreUuidAtom);

    return {
        queryKey: ["getWellboreTrajectory", wellboreUuid ?? ""],
        queryFn: () => apiService.well.getWellTrajectories(wellboreUuid ? [wellboreUuid] : []),
        staleTime: STALE_TIME,
        gcTime: CACHE_TIME,
        select: (data: WellboreTrajectory_api[]) => data[0],
        enabled: wellboreUuid ? true : false,
    };
});
