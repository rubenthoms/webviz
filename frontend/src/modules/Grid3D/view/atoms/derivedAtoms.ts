import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { IntersectionType } from "@framework/types/intersection";
import { IntersectionPolylinesAtom } from "@framework/userCreatedItems/IntersectionPolylines";
import {
    intersectionTypeAtom,
    selectedCustomIntersectionPolylineIdAtom,
    selectedWellboreUuidAtom,
} from "@modules/Grid3D/sharedAtoms/sharedAtoms";

import { atom } from "jotai";

import { fieldWellboreTrajectoriesQueryAtom } from "./queryAtoms";

export const selectedCustomIntersectionPolylineAtom = atom((get) => {
    const customIntersectionPolylineId = get(selectedCustomIntersectionPolylineIdAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);

    return customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);
});

export const intersectionReferenceSystemAtom = atom((get) => {
    const fieldWellboreTrajectories = get(fieldWellboreTrajectoriesQueryAtom);
    const wellboreUuid = get(selectedWellboreUuidAtom);
    const customIntersectionPolylines = get(IntersectionPolylinesAtom);
    const customIntersectionPolylineId = get(selectedCustomIntersectionPolylineIdAtom);

    const customIntersectionPolyline = customIntersectionPolylines.find((el) => el.id === customIntersectionPolylineId);

    const intersectionType = get(intersectionTypeAtom);

    if (intersectionType === IntersectionType.WELLBORE) {
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
    } else if (intersectionType === IntersectionType.CUSTOM_POLYLINE && customIntersectionPolyline) {
        if (customIntersectionPolyline.points.length < 2) {
            return null;
        }
        const referenceSystem = new IntersectionReferenceSystem(
            customIntersectionPolyline.points.map((point) => [point[0], point[1], 0])
        );
        referenceSystem.offset = 0;

        return referenceSystem;
    }

    return null;
});