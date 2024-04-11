import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { selectedWellboreUuidAtom } from "@modules/Grid3DIntersection/sharedAtoms/sharedAtoms";

import { atom } from "jotai";

import { fieldWellboreTrajectoriesQueryAtom } from "./queryAtoms";

export const intersectionReferenceSystemAtom = atom((get) => {
    const fieldWellboreTrajectories = get(fieldWellboreTrajectoriesQueryAtom);
    const wellboreUuid = get(selectedWellboreUuidAtom);

    if (!fieldWellboreTrajectories.data || !wellboreUuid) {
        return null;
    }

    const wellboreTrajectory = fieldWellboreTrajectories.data.find(
        (wellbore) => wellbore.wellbore_uuid === wellboreUuid
    );

    if (wellboreTrajectory) {
        const path: number[][] = [];
        for (const [index, northing] of wellboreTrajectory.northing_arr.entries()) {
            const easting = wellboreTrajectory.easting_arr[index];
            const tvd_msl = wellboreTrajectory.tvd_msl_arr[index];

            path.push([easting, northing, tvd_msl]);
        }
        const offset = wellboreTrajectory.tvd_msl_arr[0];

        const referenceSystem = new IntersectionReferenceSystem(path);
        referenceSystem.offset = offset;

        return referenceSystem;
    }

    return null;
});
