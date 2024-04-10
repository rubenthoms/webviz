import React from "react";

import { BoundingBox3d_api } from "@api";
import { IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ColorScale } from "@lib/utils/ColorScale";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection";
import { ReadoutItem } from "@modules/_shared/components/EsvIntersection/types";
import { getColorFromLayerData } from "@modules/_shared/components/EsvIntersection/utils/intersectionConversion";
import {
    getAdditionalInformationFromReadoutItem,
    getLabelFromLayerData,
} from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";

import { PolylineIntersection_trans } from "../queries/queryDataTransforms";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    polylineIntersectionData: PolylineIntersection_trans | null;
    gridBoundingBox3d: BoundingBox3d_api | null;
    colorScale: ColorScale;
};

export function Intersection(props: IntersectionProps): JSX.Element {
    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    const layers: LayerItem[] = [
        {
            id: "wellbore-path",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                stroke: "red",
                strokeWidth: "2",
                order: 6,
            },
        },
    ];

    if (props.polylineIntersectionData) {
        layers.push({
            id: "intersection",
            type: LayerType.POLYLINE_INTERSECTION,
            hoverable: true,
            options: {
                data: {
                    fenceMeshSections: props.polylineIntersectionData.fenceMeshSections.map((section) => {
                        let zMin = Number.MAX_VALUE;
                        let zMax = Number.MIN_VALUE;

                        const verticesUzArray: Float32Array = new Float32Array(section.verticesUzFloat32Arr.length);

                        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
                            const z = -section.verticesUzFloat32Arr[i + 1];
                            zMin = Math.min(zMin, z);
                            zMax = Math.max(zMax, z);
                            verticesUzArray[i] = section.verticesUzFloat32Arr[i];
                            verticesUzArray[i + 1] = z;
                        }

                        return {
                            polyIndicesArr: section.polyIndicesUintArr,
                            verticesUzArr: verticesUzArray,
                            verticesPerPolyArr: section.verticesPerPolyUintArr,
                            polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                            polyPropsArr: section.polyPropsFloat32Arr,
                            minZ: zMin,
                            maxZ: zMax,
                            startUtmX: section.start_utm_x,
                            startUtmY: section.start_utm_y,
                            endUtmX: section.end_utm_x,
                            endUtmY: section.end_utm_y,
                        };
                    }),
                    minGridPropValue: props.polylineIntersectionData.min_grid_prop_value,
                    maxGridPropValue: props.polylineIntersectionData.max_grid_prop_value,
                    colorScale: props.colorScale,
                    // hideGridlines: true,
                },
                order: 5,
            },
        });
    }

    const viewport: [number, number, number] = [0, 0, 0];
    if (props.referenceSystem) {
        const firstPoint = props.referenceSystem.projectedPath[0];
        const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
        const xMax = Math.max(firstPoint[0], lastPoint[0]);
        const xMin = Math.min(firstPoint[0], lastPoint[0]);
        const yMax = Math.max(firstPoint[1], lastPoint[1]);
        const yMin = Math.min(firstPoint[1], lastPoint[1]);

        viewport[0] = xMin + (xMax - xMin) / 2;
        viewport[1] = yMin + (yMax - yMin) / 2;
        viewport[2] = Math.max(xMax - xMin, yMax - yMin) * 5;
    }

    const handleReadoutItemsChange = React.useCallback(function handleReadoutItemsChange(
        event: EsvIntersectionReadoutEvent
    ): void {
        setReadoutItems(event.readoutItems);
    },
    []);

    return (
        <div className="relative w-full h-1/2">
            <EsvIntersection
                showGrid
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                layers={layers}
                bounds={{
                    x: [props.gridBoundingBox3d?.xmin ?? 0, props.gridBoundingBox3d?.xmax ?? 1],
                    y: [props.gridBoundingBox3d?.ymin ?? 0, props.gridBoundingBox3d?.ymax ?? 1],
                }}
                viewport={viewport}
                onReadout={handleReadoutItemsChange}
            />
            <ReadoutBox readoutItems={readoutItems} />
        </div>
    );
}

export type ReadoutBoxProps = {
    readoutItems: ReadoutItem[];
};

function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    if (props.readoutItems.length === 0) {
        return null;
    }

    return (
        <div className="absolute rounded border-2 border-neutral-300 bottom-10 left-0 bg-white p-2 flex flex-col gap-2 text-sm z-50 w-60 pointer-events-none">
            {props.readoutItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="rounded-full w-3 h-3"
                        style={{ backgroundColor: getColorFromLayerData(item.layer, item.index) }}
                    />
                    <div>
                        <strong>{getLabelFromLayerData(item)}</strong>
                        <br />
                        {getAdditionalInformationFromReadoutItem(item).map((el, index) => (
                            <span key={index} className="block">
                                {el}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
