import { PolylineIntersection_trans } from "../view/queries/queryDataTransforms";

function interpolate(x1: number, y1: number, x2: number, y2: number, x: number): number {
    return y1 + ((y2 - y1) / (x2 - x1)) * (x - x1);
}

export function backsampleIntersectionPolyline(
    completeWellborePath: number[][],
    polylineIntersection: PolylineIntersection_trans
) {
    const backsampledIntersectionPolyline: number[][] = [];

    let closestPointMin: number[] = [];
    let closestPointMax: number[] = [];

    /*
    const backsampledIntersectionPolyline: number[][] = [];
    for (const point of polylineIntersection) {
        const closestPoint = findClosestPoint(completeWellborePath, point);
        backsampledIntersectionPolyline.push(closestPoint);
    }
    return backsampledIntersectionPolyline;
    */
}
