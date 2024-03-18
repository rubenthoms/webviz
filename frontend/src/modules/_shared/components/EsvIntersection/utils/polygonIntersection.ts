export function pointIsInPolygon(
    point: number[],
    startOffset: number,
    vertices: Float32Array,
    polygonIndices: Uint32Array
): boolean {
    const numVertices = polygonIndices.length;
    const x = point[0];
    const y = point[1];
    let inside = false;

    let p1 = [startOffset + vertices[polygonIndices[0] * 2], vertices[polygonIndices[0] * 2 + 1]];
    let p2 = [0, 0];
    for (let i = 1; i <= numVertices; i++) {
        const idx = i % numVertices;
        p2 = [startOffset + vertices[polygonIndices[idx] * 2], vertices[polygonIndices[idx] * 2 + 1]];

        if (y > Math.min(p1[1], p2[1])) {
            if (y <= Math.max(p1[1], p2[1])) {
                if (x <= Math.max(p1[0], p2[0])) {
                    const xIntersection = ((y - p1[1]) * (p2[0] - p1[0])) / (p2[1] - p1[1]) + p1[0];
                    if (p1[0] === p2[0] || x <= xIntersection) {
                        inside = !inside;
                    }
                }
            }
        }

        p1 = p2;
    }

    return inside;
}
