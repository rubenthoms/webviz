import {
    Annotation,
    Layer,
    SchematicData,
    SchematicLayer,
    SurfaceData,
    WellborepathLayer,
} from "@equinor/esv-intersection";

import { PolylineIntersectionData } from "../layers/PolylineIntersectionLayer";
import { SurfaceStatisticalFanchartsData } from "../layers/SurfaceStatisticalFanchartCanvasLayer";

export function isSurfaceLayer(data: unknown): data is SurfaceData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("lines" in data) || !Array.isArray(data.lines)) {
        return false;
    }

    if (!("areas" in data) || !Array.isArray(data.areas)) {
        return false;
    }

    return true;
}

export function isPolylineIntersectionData(data: unknown): data is PolylineIntersectionData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fenceMeshSections" in data) || !Array.isArray(data.fenceMeshSections)) {
        return false;
    }

    return true;
}

export function isStatisticalFanchartsData(data: unknown): data is SurfaceStatisticalFanchartsData {
    if (typeof data !== "object" || data === null) {
        return false;
    }

    if (!("fancharts" in data) || !Array.isArray(data.fancharts)) {
        return false;
    }

    return true;
}

export function isAnnotationData(data: unknown): data is Annotation[] {
    if (!Array.isArray(data)) {
        return false;
    }

    if (
        data.length > 0 &&
        (!("title" in data[0]) || !("label" in data[0]) || !("color" in data[0]) || !("group" in data[0]))
    ) {
        return false;
    }

    return true;
}

export function isWellborepathLayer(layer: Layer<any>): layer is WellborepathLayer<[number, number][]> {
    if (layer instanceof WellborepathLayer) {
        return true;
    }

    return false;
}

export function isSchematicLayer(layer: Layer<unknown>): layer is SchematicLayer<SchematicData> {
    if (layer instanceof SchematicLayer) {
        return true;
    }

    return false;
}
