import { Annotation, Layer, SurfaceData, WellborepathLayer } from "@equinor/esv-intersection";
import { pointDistance } from "@lib/utils/geometry";

import {
    isAnnotationData,
    isPolylineIntersectionData,
    isStatisticalFanchartsData,
    isSurfaceData,
    isWellborepathLayer,
} from "./layers";

import { LayerDataItem, Shape } from "../interaction/types";
import { PolylineIntersectionData } from "../layers/PolylineIntersectionLayer";
import { SurfaceStatisticalFanchartsData } from "../layers/SurfaceStatisticalFanchartCanvasLayer";

export function makeLayerDataItems(layer: Layer<SurfaceData>): LayerDataItem[];
export function makeLayerDataItems(layer: Layer<PolylineIntersectionData>): LayerDataItem[];
export function makeLayerDataItems(layer: Layer<SurfaceStatisticalFanchartsData>): LayerDataItem[];
export function makeLayerDataItems(layer: Layer<Annotation[]>): LayerDataItem[];
export function makeLayerDataItems(layer: WellborepathLayer<[number, number][]>): LayerDataItem[];
export function makeLayerDataItems(layer: Layer<any>): LayerDataItem[] {
    if (isSurfaceData(layer.data)) {
        const dataItems: LayerDataItem[] = [];
        for (const [index, line] of layer.data.lines.entries()) {
            const id = line.id ?? `${layer.id}-line-${index}`;
            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: Shape.LINE,
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
                    shape: Shape.POLYGON,
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
                    shape: Shape.POINT,
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
                    shape: Shape.POLYGONS,
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
            const lines: number[][][] = [];

            lines.push(fanchart.data.mean);
            lines.push(fanchart.data.p10);
            lines.push(fanchart.data.p90);
            lines.push(fanchart.data.min);
            lines.push(fanchart.data.max);
            lines.push(fanchart.data.p50);

            dataItems.push({
                id,
                layer,
                index,
                intersectionItem: {
                    id,
                    shape: Shape.LINE_SET,
                    data: lines,
                },
            });
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
                    shape: Shape.WELLBORE_PATH,
                },
            },
        ];
    }

    return [];
}
