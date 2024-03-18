import { IntersectionHandlerOptions } from "../interaction/IntersectionHandler";
import { LineIntersectionCalculator, LineIntersectionResult } from "../interaction/LineIntersectionCalculator";
import { PointIntersectionCalculator, PointIntersectionResult } from "../interaction/PointIntersectionCalculator";
import { PolygonIntersectionCalculator, PolygonIntersectionResult } from "../interaction/PolygonIntersectionCalculator";
import {
    PolygonsIntersectionCalculator,
    PolygonsIntersectionResult,
} from "../interaction/PolygonsIntersectionCalculator";
import {
    HighlightObject,
    IntersectionCalculator,
    IntersectionObject,
    IntersectionResult,
    ReadoutObject,
    Shape,
} from "../interaction/types";

export function makeIntersectionCalculatorFromIntersectionObject(
    intersectionObject: IntersectionObject,
    options: IntersectionHandlerOptions
): IntersectionCalculator {
    switch (intersectionObject.shape) {
        case Shape.POINT:
            return new PointIntersectionCalculator(intersectionObject.data, options.threshold);
        case Shape.LINE:
            return new LineIntersectionCalculator(intersectionObject.data, options.threshold);
        case Shape.POLYGON:
            return new PolygonIntersectionCalculator(intersectionObject.data);
        case Shape.POLYGONS:
            return new PolygonsIntersectionCalculator(intersectionObject.data);
    }
}

function isPointIntersectionResult(
    intersectionResult: IntersectionResult
): intersectionResult is PointIntersectionResult {
    return intersectionResult.shape === Shape.POINT;
}

function isLineIntersectionResult(
    intersectionResult: IntersectionResult
): intersectionResult is LineIntersectionResult {
    return intersectionResult.shape === Shape.LINE;
}

function isPolygonIntersectionResult(
    intersectionResult: IntersectionResult
): intersectionResult is PolygonIntersectionResult {
    return intersectionResult.shape === Shape.POLYGON;
}

function isPolygonsIntersectionResult(
    intersectionResult: IntersectionResult
): intersectionResult is PolygonsIntersectionResult {
    return intersectionResult.shape === Shape.POLYGONS;
}

export function makeHighlightObjectFromIntersectionResult(
    intersectionResult: IntersectionResult,
    color: string,
    label: string
): HighlightObject {
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            shape: Shape.POINT,
            point: intersectionResult.point,
            color,
            label,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            shape: Shape.POINT,
            point: intersectionResult.point,
            color,
            label,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            shape: Shape.POLYGON,
            polygon: intersectionResult.polygon,
            color,
            label,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        return {
            shape: Shape.POLYGON,
            polygon: intersectionResult.polygon,
            color,
            label,
        };
    }
    throw new Error("Invalid intersection result");
}

export function makeReadoutObjectFromIntersectionResult(
    intersectionResult: IntersectionResult,
    color: string,
    label: string
): ReadoutObject {
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            color,
            label,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            color,
            md: intersectionResult.md,
            label,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            color,
            label,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            color,
            label,
            polygonIndex: intersectionResult.polygonIndex,
        };
    }
    throw new Error("Invalid intersection result");
}
