import React from "react";

import { BoundingBox3d_api, WellboreCasing_api } from "@api";
import { Casing, IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { ColorScale } from "@lib/utils/ColorScale";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection";
import { HighlightItem, HighlightItemShape, ReadoutItem } from "@modules/_shared/components/EsvIntersection/types";
import { getColorFromLayerData } from "@modules/_shared/components/EsvIntersection/utils/intersectionConversion";
import {
    getAdditionalInformationFromReadoutItem,
    getLabelFromLayerData,
} from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";

import { PolylineIntersection_trans } from "../queries/queryDataTransforms";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    polylineIntersectionData: PolylineIntersection_trans | null;
    wellboreCasingData: WellboreCasing_api[] | null;
    gridBoundingBox3d: BoundingBox3d_api | null;
    colorScale: ColorScale;
    showGridLines: boolean;
    zFactor: number;
    intersectionExtensionLength: number;
    hoveredMd: number | null;
    onReadout: (event: EsvIntersectionReadoutEvent) => void;
};

export function Intersection(props: IntersectionProps): JSX.Element {
    const { onReadout } = props;

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
                    hideGridlines: !props.showGridLines,
                    extensionLengthStart: props.intersectionExtensionLength,
                },
                order: 5,
            },
        });
    }

    if (props.wellboreCasingData) {
        const casingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Casing");
        const tubingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Tubing");

        const casings: Casing[] = casingData.map((casing, index) => ({
            id: `casing-${index}`,
            diameter: casing.diameter_numeric,
            start: casing.depth_top_md,
            end: casing.depth_bottom_md,
            innerDiameter: casing.diameter_inner,
            kind: "casing",
            hasShoe: false,
        }));

        layers.push({
            id: "schematic",
            type: LayerType.SCHEMATIC,
            hoverable: true,
            options: {
                data: {
                    holeSizes: [],
                    casings,
                    cements: [],
                    completion: [],
                    pAndA: [],
                    symbols: {},
                    perforations: [],
                },
                order: 7,
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

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            setReadoutItems(event.readoutItems);
            onReadout(event);
        },
        [onReadout]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && props.hoveredMd) {
        const point = props.referenceSystem.project(props.hoveredMd);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
        });
    }

    return (
        <div className="relative w-full h-1/2">
            <EsvIntersection
                showGrid
                zFactor={props.zFactor}
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                layers={layers}
                bounds={{
                    x: [props.gridBoundingBox3d?.xmin ?? 0, props.gridBoundingBox3d?.xmax ?? 1],
                    y: [props.gridBoundingBox3d?.ymin ?? 0, props.gridBoundingBox3d?.ymax ?? 1],
                }}
                viewport={viewport}
                intersectionThreshold={50}
                highlightItems={highlightItems}
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

    function makeAdditionalInformation(item: ReadoutItem): React.ReactNode {
        const additionalInformation = getAdditionalInformationFromReadoutItem(item);
        return Object.entries(additionalInformation).map(([key, value], index) => {
            return (
                <span key={index} className="block">
                    {key}: {value}
                </span>
            );
        });
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
                        {makeAdditionalInformation(item)}
                    </div>
                </div>
            ))}
        </div>
    );
}
