import {
    Casing,
    Cement,
    Completion,
    Controller,
    HoleSize,
    Layer,
    PAndA,
    Perforation,
    SchematicData,
} from "@equinor/esv-intersection";

import {
    isAnnotationData,
    isPolylineIntersectionData,
    isSchematicLayer,
    isSeismicLayer,
    isStatisticalFanchartsData,
    isSurfaceLayer,
    isWellborepathLayer,
} from "./layers";

import { FanchartIntersectedItem, FanchartIntersectionCalculator } from "../interaction/FanchartIntersectionCalculator";
import { IntersectionHandlerOptions } from "../interaction/IntersectionHandler";
import { LineIntersectedItem, LineIntersectionCalculator } from "../interaction/LineIntersectionCalculator";
import { LineSetIntersectedItem, LineSetIntersectionCalculator } from "../interaction/LineSetIntersectionCalculator";
import { PointIntersectedItem, PointIntersectionCalculator } from "../interaction/PointIntersectionCalculator";
import { PolygonIntersectedItem, PolygonIntersectionCalculator } from "../interaction/PolygonIntersectionCalculator";
import { PolygonsIntersectedItem, PolygonsIntersectionCalculator } from "../interaction/PolygonsIntersectionCalculator";
import { RectangleIntersectionCalculator } from "../interaction/RectangleIntersectionCalculator";
import {
    WellborePathIntersectedItem,
    WellborePathIntersectionCalculator,
} from "../interaction/WellborePathIntersectionCalculator";
import {
    HighlightItem,
    HighlightItemShape,
    IntersectedItem,
    IntersectionCalculator,
    IntersectionItem,
    IntersectionItemShape,
    ReadoutItem,
} from "../interaction/types";

export function makeIntersectionCalculatorFromIntersectionItem(
    intersectionItem: IntersectionItem,
    options: IntersectionHandlerOptions,
    controller: Controller
): IntersectionCalculator {
    switch (intersectionItem.shape) {
        case IntersectionItemShape.POINT:
            return new PointIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.LINE:
            return new LineIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.LINE_SET:
            return new LineSetIntersectionCalculator(intersectionItem.data, options.threshold);
        case IntersectionItemShape.POLYGON:
            return new PolygonIntersectionCalculator(intersectionItem.data);
        case IntersectionItemShape.POLYGONS:
            return new PolygonsIntersectionCalculator(intersectionItem.data);
        case IntersectionItemShape.WELLBORE_PATH:
            return new WellborePathIntersectionCalculator(controller, options.threshold);
        case IntersectionItemShape.FANCHART:
            return new FanchartIntersectionCalculator(
                intersectionItem.data.lines,
                intersectionItem.data.hull,
                options.threshold
            );
        case IntersectionItemShape.RECTANGLE:
            return new RectangleIntersectionCalculator(intersectionItem.data);
    }
}

function isPointIntersectionResult(intersectionResult: IntersectedItem): intersectionResult is PointIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POINT;
}

function isLineIntersectionResult(intersectionResult: IntersectedItem): intersectionResult is LineIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.LINE;
}

function isLineSetIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is LineSetIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.LINE_SET;
}

function isPolygonIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POLYGON;
}

function isPolygonsIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonsIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.POLYGONS;
}

function isWellborePathIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is WellborePathIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.WELLBORE_PATH;
}

function isFanchartIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is FanchartIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.FANCHART;
}

function isRectangleIntersectionResult(
    intersectionResult: IntersectedItem
): intersectionResult is PolygonIntersectedItem {
    return intersectionResult.shape === IntersectionItemShape.RECTANGLE;
}

function getColorFromLayerData(layer: Layer<unknown>, index: number): string {
    if (isSurfaceLayer(layer.data)) {
        return layer.data.lines[index].color.toString();
    }

    if (isPolylineIntersectionData(layer.data)) {
        return "rgba(0, 0, 255, 0.3)";
    }

    if (isStatisticalFanchartsData(layer.data)) {
        return layer.data.fancharts[index].color ?? "#000";
    }

    if (isAnnotationData(layer.data)) {
        return layer.data[index].color;
    }

    if (isWellborepathLayer(layer)) {
        return "rgb(255, 0, 0)";
    }

    if (isSchematicLayer(layer)) {
        return "#000";
    }

    if (isSeismicLayer(layer)) {
        return "rgba(0, 0, 255, 0.3)";
    }

    return "#000";
}

function getLabelFromLayerData(readoutItem: ReadoutItem): string {
    if (isSurfaceLayer(readoutItem.layer.data)) {
        return readoutItem.layer.data.lines[readoutItem.index].label;
    }

    if (isPolylineIntersectionData(readoutItem.layer.data)) {
        return `Intersection section ${readoutItem.index + 1}`;
    }

    if (isStatisticalFanchartsData(readoutItem.layer.data)) {
        return readoutItem.layer.data.fancharts[readoutItem.index].label ?? "Fanchart";
    }

    if (isAnnotationData(readoutItem.layer.data)) {
        return `${readoutItem.layer.data[readoutItem.index].title}<br>${
            readoutItem.layer.data[readoutItem.index].label
        }`;
    }

    if (isWellborepathLayer(readoutItem.layer)) {
        return "Wellborepath";
    }

    if (isSchematicLayer(readoutItem.layer)) {
        switch (readoutItem.schematicType) {
            case "casings":
                return "Casing";
            case "cements":
                return "Cement";
            case "completion":
                return "Completion";
            case "holeSizes":
                return "Hole size";
            case "pAndA":
                return "P&A";
            case "perforations":
                return "Perforation";
            case "symbols":
                return "Symbol";
        }
    }

    if (isSeismicLayer(readoutItem.layer)) {
        return "Seismic";
    }

    return "Unknown";
}

type ArrayElement<T extends unknown[]> = T extends readonly (infer U)[] ? U : T;

function makeSchematicInfo<T extends keyof Omit<SchematicData, "symbols">>(
    type: T,
    item: ArrayElement<SchematicData[T]>
): string[] {
    const arr: string[] = [];

    if (type === "casings") {
        const casing = item as Casing;
        arr.push(`ID: ${casing.id}`);
        arr.push(`Diameter: ${casing.diameter}`);
        arr.push(`Inner diameter: ${casing.innerDiameter}`);
        arr.push(`Has shoe: ${casing.hasShoe}`);
        arr.push(`MD range: ${casing.start} - ${casing.end}`);
    } else if (type === "cements") {
        const cement = item as Cement;
        arr.push(`ID: ${cement.id}`);
        arr.push(`TOC: ${cement.toc}`);
    } else if (type === "completion") {
        const completion = item as Completion;
        arr.push(`ID: ${completion.id}`);
        arr.push(`Kind: ${completion.kind}`);
        arr.push(`Diameter: ${completion.diameter}`);
        arr.push(`MD range: ${completion.start} - ${completion.end}`);
    } else if (type === "holeSizes") {
        const holeSize = item as HoleSize;
        arr.push(`ID: ${holeSize.id}`);
        arr.push(`Diameter: ${holeSize.diameter}`);
        arr.push(`MD range: ${holeSize.start} - ${holeSize.end}`);
    } else if (type === "pAndA") {
        const pAndA = item as PAndA;
        arr.push(`ID: ${pAndA.id}`);
        arr.push(`Kind: ${pAndA.kind}`);
        if (pAndA.kind === "pAndASymbol") {
            arr.push(`Diameter: ${pAndA.diameter}`);
        }
        arr.push(`MD range: ${pAndA.start} - ${pAndA.end}`);
    } else if (type === "perforations") {
        const perforation = item as Perforation;
        arr.push(`ID: ${perforation.id}`);
        arr.push(`Open: ${perforation.isOpen}`);
        arr.push(`Subkind: ${perforation.subKind}`);
        arr.push(`MD range: ${perforation.start} - ${perforation.end}`);
    }
    return arr;
}

function getAdditionalInformationFromReadoutItem(readoutItem: ReadoutItem): string[] {
    const infoArr: string[] = [];

    if (isPolylineIntersectionData(readoutItem.layer.data)) {
        if (readoutItem.polygonIndex) {
            const cellIndexOffset = readoutItem.layer.data.fenceMeshSections
                .slice(0, readoutItem.index)
                .reduce((acc, section) => acc + section.polySourceCellIndicesArr.length, 0);
            infoArr.push(`Polygon index: ${cellIndexOffset + readoutItem.polygonIndex}`);

            const propValue =
                readoutItem.layer.data.fenceMeshSections[readoutItem.index].polyPropsArr[readoutItem.polygonIndex];
            infoArr.push(`Value: ${propValue}`);
        }
    }

    if (isWellborepathLayer(readoutItem.layer)) {
        infoArr.push(`MD: ${readoutItem.md?.toFixed(2)}`);
    }

    if (isStatisticalFanchartsData(readoutItem.layer.data)) {
        const fanchart = readoutItem.layer.data.fancharts[readoutItem.index];
        if (fanchart && readoutItem.points) {
            const keys = Object.keys(fanchart.data).filter((el) => {
                if (el === "mean") {
                    return fanchart.visibility?.mean ?? true;
                }
                if (el === "min") {
                    return fanchart.visibility?.minMax ?? true;
                }
                if (el === "max") {
                    return fanchart.visibility?.minMax ?? true;
                }
                if (el === "p10") {
                    return fanchart.visibility?.p10p90 ?? true;
                }
                if (el === "p90") {
                    return fanchart.visibility?.p10p90 ?? true;
                }
                if (el === "p50") {
                    return fanchart.visibility?.p50 ?? true;
                }
                return false;
            });

            for (const [index, point] of readoutItem.points.entries()) {
                const label = keys[index];
                infoArr.push(`${label}: ${point[1].toFixed(2)}`);
            }
        }
    }

    if (isAnnotationData(readoutItem.layer.data)) {
        const md = readoutItem.layer.data[readoutItem.index].md;
        if (md) {
            infoArr.push(`MD: ${md.toFixed(2)}`);
        }
    }

    if (isSchematicLayer(readoutItem.layer)) {
        const data = readoutItem.layer.data;
        if (data) {
            const schematicType = readoutItem.schematicType;
            if (schematicType && data[schematicType] && schematicType !== "symbols") {
                infoArr.push(...makeSchematicInfo(schematicType, data[schematicType][readoutItem.index]));
            }
        }
    } else {
        infoArr.push(`(X: ${readoutItem.point[0].toFixed(2)}, Y: ${readoutItem.point[1].toFixed(2)})`);
    }

    if (isSeismicLayer(readoutItem.layer)) {
        const seismicCanvasData = readoutItem.layer.getData();
        const ctx = readoutItem.layer.ctx;
        if (seismicCanvasData) {
            if (ctx) {
                const transformedPoint = ctx
                    .getTransform()
                    .transformPoint({ x: readoutItem.point[0], y: readoutItem.point[1] });

                const imageX = transformedPoint.x;
                const imageY = transformedPoint.y;
                const imageData = ctx.getImageData(imageX, imageY, 1, 1);

                infoArr.push(`R: ${imageData.data[0]}`);
                infoArr.push(`G: ${imageData.data[1]}`);
                infoArr.push(`B: ${imageData.data[2]}`);

                infoArr.push(
                    `Color: <span style="border-radius: 50%; width: 1rem; height: 1rem; display: block; background-color: ${`rgb(${imageData.data[0]}, ${imageData.data[1]}, ${imageData.data[2]});" />`}`
                );
            }
        }
    }

    return infoArr;
}

export function makeHighlightItemFromIntersectionResult(
    intersectionResult: IntersectedItem,
    layer: Layer<unknown>,
    index: number
): HighlightItem {
    const color = getColorFromLayerData(layer, index);
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            color,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            color,
        };
    }
    if (isLineSetIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINTS,
            points: intersectionResult.points,
            color,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POLYGON,
            polygon: intersectionResult.polygon,
            color,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POLYGON,
            polygon: intersectionResult.polygon,
            color,
        };
    }
    if (isWellborePathIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            color,
        };
    }
    if (isFanchartIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.LINE,
            line: intersectionResult.line,
            color,
        };
    }
    if (isRectangleIntersectionResult(intersectionResult)) {
        return {
            shape: HighlightItemShape.POINT,
            point: intersectionResult.point,
            color,
        };
    }
    throw new Error("Invalid intersection result");
}

export function makeReadoutItemFromIntersectionResult(
    intersectionResult: IntersectedItem,
    layer: Layer<unknown>,
    index: number
): ReadoutItem {
    if (isPointIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isLineIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isLineSetIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            points: intersectionResult.points,
            layer,
            index,
        };
    }
    if (isPolygonIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    if (isPolygonsIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
            polygonIndex: intersectionResult.polygonIndex,
        };
    }
    if (isWellborePathIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            md: intersectionResult.md,
            layer,
            index,
        };
    }
    if (isFanchartIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            points: intersectionResult.points,
            layer,
            index,
        };
    }
    if (isRectangleIntersectionResult(intersectionResult)) {
        return {
            point: intersectionResult.point,
            layer,
            index,
        };
    }
    throw new Error("Invalid intersection result");
}

export function makeHtmlFromReadoutItem(readoutItem: ReadoutItem): string {
    const color = getColorFromLayerData(readoutItem.layer, readoutItem.index);
    const label = getLabelFromLayerData(readoutItem);
    const additionalInformation = getAdditionalInformationFromReadoutItem(readoutItem);

    return `<div style="display: flex; flex-direction: row; align-items: center; gap: 0.5rem;"><span style="display: block; width: 10px; height: 10px; border-radius: 50%; margin-right: 0.25rem; background-color: ${color}"></span><div><span style="text-overflow: ellipsis; font-weight: bold;">${label}</span><br>${additionalInformation.join(
        "<br>"
    )}</div></div>`;
}
