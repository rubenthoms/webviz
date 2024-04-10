import { BoundingBox3d_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { EsvIntersection, LayerItem, LayerType } from "@modules/_shared/components/EsvIntersection";

import { PolylineIntersection_trans } from "../queries/queryDataTransforms";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    polylineIntersectionData: PolylineIntersection_trans | null;
    gridBoundingBox3d: BoundingBox3d_api | null;
};

export function Intersection(props: IntersectionProps): JSX.Element {
    const layers: LayerItem[] = [
        {
            id: "wellbore-path",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                stroke: "red",
                strokeWidth: "2",
            },
        },
    ];

    return (
        <div className="relative w-full h-1/2">
            <EsvIntersection
                showGrid
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                layers={layers}
                bounds={{
                    x: [props.gridBoundingBox3d?.xmin ?? 0, props.gridBoundingBox3d?.xmax ?? 0],
                    y: [props.gridBoundingBox3d?.ymin ?? 0, props.gridBoundingBox3d?.ymax ?? 0],
                }}
            />
        </div>
    );
}
