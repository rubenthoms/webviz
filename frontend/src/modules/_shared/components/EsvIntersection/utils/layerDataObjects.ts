import { Layer, SurfaceData, WellborepathLayer } from "@equinor/esv-intersection";
import { pointDistance } from "@lib/utils/geometry";

import { LayerDataObject, Shape } from "../interaction/types";
import { PolylineIntersectionData } from "../layers/PolylineIntersectionLayer";
import { SurfaceStatisticalFanchartsData } from "../layers/SurfaceStatisticalFanchartCanvasLayer";

function isSurfaceData(data: unknown): data is SurfaceData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("lines" in data) || !Array.isArray(data.lines)) {
        return false;
    }

    return true;
}

function isPolylineIntersectionData(data: unknown): data is PolylineIntersectionData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fenceMeshSections" in data) || !Array.isArray(data.fenceMeshSections)) {
        return false;
    }

    return true;
}

function isStatisticalFanchartsData(data: unknown): data is SurfaceStatisticalFanchartsData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fancharts" in data) || !Array.isArray(data.fancharts)) {
        return false;
    }

    return true;
}

function isWellborepathLayer(layer: Layer<any>): layer is WellborepathLayer<[number, number][]> {
    if (layer instanceof WellborepathLayer) {
        return true;
    }

    return false;
}

export function makeLayerDataObjects(layer: Layer<SurfaceData>): LayerDataObject[];
export function makeLayerDataObjects(layer: Layer<PolylineIntersectionData>): LayerDataObject[];
export function makeLayerDataObjects(layer: Layer<SurfaceStatisticalFanchartsData>): LayerDataObject[];
export function makeLayerDataObjects(layer: WellborepathLayer<[number, number][]>): LayerDataObject[];
export function makeLayerDataObjects(layer: Layer<any>): LayerDataObject[] {
    if (isSurfaceData(layer.data)) {
        const dataObjects: LayerDataObject[] = [];
        for (const [index, line] of layer.data.lines.entries()) {
            dataObjects.push({
                id: line.id ?? `${layer.id}-${index}`,
                layerId: layer.id,
                color: line.color.toString(),
                label: line.label,
                intersectionObject: {
                    id: line.id ?? `${layer.id}-line-${index}`,
                    shape: Shape.LINE,
                    data: line.data,
                },
            });
        }

        for (const [index, area] of layer.data.areas.entries()) {
            dataObjects.push({
                id: area.id ?? `${layer.id}-${index}`,
                layerId: layer.id,
                color: area.color.toString(),
                label: area.label ?? "",
                intersectionObject: {
                    id: area.id ?? `${layer.id}-area-${index}`,
                    shape: Shape.POLYGON,
                    data: area.data,
                },
            });
        }

        return dataObjects;
    }

    if (isPolylineIntersectionData(layer.data)) {
        const dataObjects: LayerDataObject[] = [];
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

            dataObjects.push({
                id: `${layer.id}-${index}`,
                layerId: layer.id,
                color: "rgba(0, 0, 255, 0.25)",
                label: `Fence mesh section ${index + 1}`,
                intersectionObject: {
                    id: `${layer.id}-${index}`,
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
        return dataObjects;
    }

    if (isStatisticalFanchartsData(layer.data)) {
        const dataObjects: LayerDataObject[] = [];
        for (const [index, fanchart] of layer.data.fancharts.entries()) {
            const color = fanchart.color ?? "black";
            const id = fanchart.id ?? `${layer.id}-${index}`;

            dataObjects.push({
                id: `${id}-mean`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (mean)` ?? "Mean",
                intersectionObject: {
                    id: `${id}-mean`,
                    shape: Shape.LINE,
                    data: fanchart.data.mean,
                },
            });

            dataObjects.push({
                id: `${id}-p10`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (p10)` ?? "P10",
                intersectionObject: {
                    id: `${id}-p10`,
                    shape: Shape.LINE,
                    data: fanchart.data.p10,
                },
            });

            dataObjects.push({
                id: `${id}-p90`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (p90)` ?? "P90",
                intersectionObject: {
                    id: `${id}-p90`,
                    shape: Shape.LINE,
                    data: fanchart.data.p90,
                },
            });

            dataObjects.push({
                id: `${id}-min`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (min)` ?? "Min",
                intersectionObject: {
                    id: `${id}-min`,
                    shape: Shape.LINE,
                    data: fanchart.data.min,
                },
            });

            dataObjects.push({
                id: `${id}-max`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (max)` ?? "Max",
                intersectionObject: {
                    id: `${id}-max`,
                    shape: Shape.LINE,
                    data: fanchart.data.max,
                },
            });

            dataObjects.push({
                id: `${id}-p50`,
                layerId: layer.id,
                color,
                label: `${fanchart.label} (p50)` ?? "P50",
                intersectionObject: {
                    id: `${id}-p50`,
                    shape: Shape.LINE,
                    data: fanchart.data.p50,
                },
            });
        }
        return dataObjects;
    }

    if (isWellborepathLayer(layer)) {
        return [
            {
                id: layer.id,
                layerId: layer.id,
                color: "black",
                label: "Wellborepath",
                intersectionObject: {
                    id: layer.id,
                    shape: Shape.LINE,
                    data: layer.data ?? layer.referenceSystem?.projectedPath ?? [],
                },
                isWellbore: true,
            },
        ];
    }

    return [];
}
