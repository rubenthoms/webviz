import { Layer } from "@equinor/esv-intersection";
import { pointDistance } from "@lib/utils/geometry";

import { isEqual } from "lodash";

import {
    isAnnotationData,
    isPolylineIntersectionData,
    isSeismicLayer,
    isStatisticalFanchartsData,
    isSurfaceLayer,
    isWellborepathLayer,
} from "./layers";

import { IntersectionItem, IntersectionItemShape, LayerDataItem } from "../interaction/types";

export function makeLayerDataItems(layer: Layer<any>): LayerDataItem[] {
    if (isSurfaceLayer(layer.data)) {
        const dataItems: LayerDataItem[] = [];
        for (const [index, line] of layer.data.lines.entries()) {
            const id = line.id ?? `${layer.id}-line-${index}`;
            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: IntersectionItemShape.LINE,
                    data: line.data,
                },
            });
        }

        for (const [index, area] of layer.data.areas.entries()) {
            const id = area.id ?? `${layer.id}-area-${index}`;
            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: IntersectionItemShape.POLYGON,
                    data: area.data,
                },
            });
        }

        return dataItems;
    }

    if (isAnnotationData(layer.data)) {
        const dataItems: LayerDataItem[] = [];
        for (const [index, annotation] of layer.data.entries()) {
            let point = [0, 0];
            if (annotation.md !== undefined) {
                point = layer.referenceSystem?.project(annotation.md) ?? [0, 0];
            } else if (annotation.pos !== undefined) {
                point = annotation.pos;
            }
            const id = `${layer.id}-annotation-${index}`;
            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: IntersectionItemShape.POINT,
                    data: point,
                },
            });
        }
        return dataItems;
    }

    if (isPolylineIntersectionData(layer.data)) {
        const dataItems: LayerDataItem[] = [];
        let startU = 0;
        for (const [index, fenceMeshSection] of layer.data.fenceMeshSections.entries()) {
            const uVectorLength = pointDistance(
                {
                    x: fenceMeshSection.startUtmX,
                    y: fenceMeshSection.startUtmY,
                },
                {
                    x: fenceMeshSection.endUtmX,
                    y: fenceMeshSection.endUtmY,
                }
            );

            const id = `${layer.id}-${index}`;

            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: IntersectionItemShape.POLYGONS,
                    data: {
                        vertices: fenceMeshSection.verticesUzArr,
                        polygons: fenceMeshSection.polysArr,
                        xMin: startU,
                        xMax: startU + uVectorLength,
                        yMin: fenceMeshSection.minZ,
                        yMax: fenceMeshSection.maxZ,
                    },
                },
            });

            startU += uVectorLength;
        }
        return dataItems;
    }

    if (isStatisticalFanchartsData(layer.data)) {
        const dataItems: LayerDataItem[] = [];
        for (const [index, fanchart] of layer.data.fancharts.entries()) {
            const id = fanchart.id ?? `${layer.id}-${index}`;
            let hull: number[][] = [];
            const lines: number[][][] = [];
            let intersectionItem: IntersectionItem | null = null;

            if (fanchart.visibility?.mean ?? true) {
                lines.push(fanchart.data.mean);
            }

            if (fanchart.visibility?.minMax ?? true) {
                if (!isEqual(fanchart.data.min, fanchart.data.max)) {
                    hull = [...fanchart.data.min, ...fanchart.data.max.toReversed(), fanchart.data.min[0]];
                }
                lines.push(fanchart.data.min);
                lines.push(fanchart.data.max);
            }
            if (fanchart.visibility?.p10p90 ?? true) {
                if (hull.length === 0 && !isEqual(fanchart.data.p10, fanchart.data.p90)) {
                    hull = [...fanchart.data.p10, ...fanchart.data.p90.toReversed(), fanchart.data.p10[0]];
                }
                lines.push(fanchart.data.p10);
                if (fanchart.visibility?.p50 ?? true) {
                    lines.push(fanchart.data.p50);
                }
                lines.push(fanchart.data.p90);
            } else if (fanchart.visibility?.p50 ?? true) {
                lines.push(fanchart.data.p50);
            }

            if (hull.length > 0) {
                intersectionItem = {
                    id,
                    shape: IntersectionItemShape.FANCHART,
                    data: {
                        hull,
                        lines,
                    },
                };
            } else {
                intersectionItem = {
                    id,
                    shape: IntersectionItemShape.LINE_SET,
                    data: lines,
                };
            }

            if (intersectionItem) {
                dataItems.push({
                    id,
                    layer,
                    index,
                    intersectionItem,
                });
            }
        }
        return dataItems;
    }

    if (isWellborepathLayer(layer)) {
        if (!layer.referenceSystem) {
            return [];
        }
        return [
            {
                id: layer.id,
                layer,
                index: 0,
                intersectionItem: {
                    id: layer.id,
                    shape: IntersectionItemShape.WELLBORE_PATH,
                },
            },
        ];
    }

    if (isSeismicLayer(layer)) {
        if (!layer.data) {
            return [];
        }
        const x = layer.data.options.x;
        const y = layer.data.options.y;
        const w = layer.data.options.width;
        const h = layer.data.options.height;

        return [
            {
                id: layer.id,
                layer,
                index: 0,
                intersectionItem: {
                    id: layer.id,
                    shape: IntersectionItemShape.RECTANGLE,
                    data: [
                        [x, y],
                        [x + w, y + h],
                    ],
                },
            },
        ];
    }

    return [];
}
