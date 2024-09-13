export function extractSurfaceNamesAndLayers(surfaceNamesAndLayers: string[]): {
    surfaceName: string;
    surfaceLayers: string[];
}[] {
    const surfaceNamesAndLayersMap: Map<string, Set<string>> = new Map();

    const regex = /^([\w .]+?)( (top|bottom))?$/i;

    for (const surfaceNameOrLayer of surfaceNamesAndLayers) {
        const match = regex.exec(surfaceNameOrLayer);
        if (match) {
            const [, surfaceName, , surfaceLayer] = match;
            const surfaceLayers = surfaceNamesAndLayersMap.get(surfaceName) || new Set();
            if (surfaceLayer) {
                surfaceLayers.add(surfaceLayer);
            }
            surfaceNamesAndLayersMap.set(surfaceName, surfaceLayers);
        }
    }

    return Array.from(surfaceNamesAndLayersMap.entries()).map(([surfaceName, surfaceLayers]) => ({
        surfaceName,
        surfaceLayers: Array.from(surfaceLayers),
    }));
}

export function combineSurfaceNameAndLayer(surfaceName: string | null, surfaceLayer: string | null): string | null {
    if (!surfaceName || !surfaceLayer) {
        return null;
    }
    return surfaceLayer !== "DEFAULT" ? `${surfaceName} ${surfaceLayer}` : surfaceName;
}
