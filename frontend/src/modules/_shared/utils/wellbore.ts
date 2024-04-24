import simplify from "simplify-js";

function normalizeVector(vector: number[]): number[] {
    const vectorLength = Math.sqrt(vector[0] ** 2 + vector[1] ** 2);
    return [vector[0] / vectorLength, vector[1] / vectorLength];
}

/*
    Calculates a simplified version of the wellbore trajectory in the XY plane by using the Ramer-Douglas-Peucker algorithm.
    Can also extend the trajectory by a specified length in the direction of the first and last non-zero vectors.
    If the wellbore is completely vertical, the trajectory will be extended in the x-direction.
*/
export function calcExtendedSimplifiedWellboreTrajectoryInXYPlane(
    wellboreTrajectory: number[][],
    extensionLength: number = 0,
    epsilon: number = 0.1
): number[][] {
    const polylineUtmXy: number[][] = [];

    const adjustedWellboreTrajectory = wellboreTrajectory.map((point) => ({ x: point[0], y: point[1] }));

    const simplifiedCurve = simplify(adjustedWellboreTrajectory, epsilon).map((point) => [point.x, point.y]);
    console.debug("Simplified wellbore points count: ", simplifiedCurve.length);

    for (const point of simplifiedCurve) {
        polylineUtmXy.push([point[0], point[1]]);
    }

    if (extensionLength > 0) {
        const vectorEndPoint = simplifiedCurve[simplifiedCurve.length - 1];
        let vectorStartPoint = vectorEndPoint;
        for (let i = simplifiedCurve.length - 2; i >= 0; i--) {
            if (simplifiedCurve[i][0] !== vectorEndPoint[0] || simplifiedCurve[i][1] !== vectorEndPoint[1]) {
                vectorStartPoint = simplifiedCurve[i];
                break;
            }
        }

        const vector = [vectorEndPoint[0] - vectorStartPoint[0], vectorEndPoint[1] - vectorStartPoint[1]];

        if (vector[0] === 0 && vector[1] === 0) {
            vector[0] = 1;
        }

        const normalizedVector = normalizeVector(vector);

        const extendedFirstPoint = [
            simplifiedCurve[0][0] - normalizedVector[0] * extensionLength,
            simplifiedCurve[0][1] - normalizedVector[1] * extensionLength,
        ];
        const extendedLastPoint = [
            simplifiedCurve[simplifiedCurve.length - 1][0] + normalizedVector[0] * extensionLength,
            simplifiedCurve[simplifiedCurve.length - 1][1] + normalizedVector[1] * extensionLength,
        ];

        polylineUtmXy.unshift(extendedFirstPoint);
        polylineUtmXy.push(extendedLastPoint);
    }

    return polylineUtmXy;
}
