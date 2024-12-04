import { FilterContext, Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { CollisionFilterExtension } from "@deck.gl/extensions";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { Vec2, rotatePoint2Around } from "@lib/utils/vec2";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { FeatureCollection, GeometryCollection } from "geojson";

export class AdvancedWellsLayer extends WellsLayer {
    static layerName: string = "WellsLayer";

    // @ts-ignore
    state!: {
        labelCoordsMap: Map<number, WellboreLabelCoords[]>;
    };

    constructor(props: any) {
        super(props);
    }

    filterSubLayer(context: FilterContext): boolean {
        const { labelCoordsMap } = this.state;

        const reg = /names-zoom-([-\d\\.]+)/;
        const match = context.layer.id.match(reg);

        if (match) {
            const zoom = parseFloat(match[1]);
            const zoomLevels = Array.from(labelCoordsMap.keys());
            const closestZoomLevel = zoomLevels.reduce((prev, curr) =>
                Math.abs(curr - context.viewport.zoom) < Math.abs(prev - context.viewport.zoom) ? curr : prev
            );
            return closestZoomLevel === zoom && context.viewport.zoom > -4;
        }

        return true;
    }

    private makeLabelData(): Map<number, WellboreLabelCoords[]> {
        const labelCoordsMap = new Map<number, WellboreLabelCoords[]>();
        for (let z = 1; z > -5; z--) {
            const labelCoords = precalculateLabelPositions(this.props.data as FeatureCollection, 300 / 2 ** z);
            labelCoordsMap.set(z, labelCoords);
        }

        return labelCoordsMap;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        super.updateState(params);

        if (!params.changeFlags.dataChanged) {
            return;
        }

        const labelCoordsMap = this.makeLabelData();
        this.setState({ labelCoordsMap });
    }

    initializeState(): void {
        super.initializeState();

        this.setState({
            labelCoords: new Map(),
        });
    }

    renderLayers(): LayersList {
        const layers = super.renderLayers();

        if (!Array.isArray(layers)) {
            return layers;
        }

        const colorsLayer = layers.find((layer) => {
            if (!(layer instanceof Layer)) {
                return false;
            }

            return layer.id.includes("colors");
        });

        const textLayer = layers.find((layer) => {
            if (!(layer instanceof TextLayer)) {
                return false;
            }

            return layer.id.includes("names");
        });

        if (!(colorsLayer instanceof GeoJsonLayer)) {
            return layers;
        }

        if (!(textLayer instanceof TextLayer)) {
            return layers;
        }

        const newColorsLayer = new GeoJsonLayer({
            data: colorsLayer.props.data,
            pickable: true,
            stroked: false,
            positionFormat: colorsLayer.props.positionFormat,
            pointRadiusUnits: "meters",
            lineWidthUnits: "meters",
            pointRadiusScale: this.props.pointRadiusScale,
            lineWidthScale: this.props.lineWidthScale,
            getLineWidth: colorsLayer.props.getLineWidth,
            getPointRadius: colorsLayer.props.getPointRadius,
            lineBillboard: true,
            pointBillboard: true,
            parameters: colorsLayer.props.parameters,
            visible: colorsLayer.props.visible,
            id: "colors",
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 5,
            extensions: colorsLayer.props.extensions,
            getDashArray: colorsLayer.props.getDashArray,
            getLineColor: colorsLayer.props.getLineColor,
            getFillColor: colorsLayer.props.getFillColor,
            autoHighlight: true,
            onHover: () => {},
        });

        const zoomLabelsLayers: Layer<any>[] = [];

        for (const [zoom, labelCoords] of this.state.labelCoordsMap) {
            zoomLabelsLayers.push(
                new TextLayer({
                    id: `names-zoom-${zoom}`,
                    data: labelCoords,
                    getColor: [0, 0, 0],
                    getBackgroundColor: [255, 255, 255],
                    getBorderColor: [0, 173, 230],
                    getBorderWidth: 1,
                    getPosition: (d: WellboreLabelCoords) => d.coords,
                    getText: (d: WellboreLabelCoords) => d.name,
                    getSize: 16,
                    getAngle: (d: WellboreLabelCoords) => d.angle,
                    billboard: false,
                    background: true,
                    backgroundPadding: [4, 1],
                    fontFamily: "monospace",
                    collisionEnabled: true,
                    sizeUnits: "meters",
                    sizeMaxPixels: 20,
                    sizeMinPixels: 10,
                    extensions: [new CollisionFilterExtension()],
                })
            );
        }
        return [
            newColorsLayer,
            ...layers.filter((layer) => layer !== colorsLayer && layer !== textLayer),
            ...zoomLabelsLayers,
        ];
    }
}

type WellboreLabelCoords = {
    wellboreUuid: string;
    name: string;
    coords: [number, number, number];
    angle: number;
};

function precalculateLabelPositions(data: FeatureCollection, minDistance: number = 1000): WellboreLabelCoords[] {
    const labelCoords: WellboreLabelCoords[] = [];

    function makeBoundingBox(
        midPoint: [number, number],
        width: number,
        height: number,
        angle: number
    ): {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    } {
        const topLeft: Vec2 = {
            x: midPoint[0] - width / 2,
            y: midPoint[1] - height / 2,
        };

        const bottomRight: Vec2 = {
            x: midPoint[0] + width / 2,
            y: midPoint[1] + height / 2,
        };

        const midPointVec2: Vec2 = {
            x: midPoint[0],
            y: midPoint[1],
        };

        const rotatedTopLeft = rotatePoint2Around(topLeft, midPointVec2, angle);
        const rotatedBottomRight = rotatePoint2Around(bottomRight, midPointVec2, angle);

        return {
            x0: Math.min(rotatedTopLeft.x, rotatedBottomRight.x),
            y0: Math.min(rotatedTopLeft.y, rotatedBottomRight.y),
            x1: Math.max(rotatedTopLeft.x, rotatedBottomRight.x),
            y1: Math.max(rotatedTopLeft.y, rotatedBottomRight.y),
        };
    }

    for (const feature of data.features) {
        const name = feature.properties?.name;
        const uuid = feature.properties?.uuid;
        if (!uuid) {
            continue;
        }

        const collection = feature.geometry as GeometryCollection;
        if (!collection.geometries) {
            continue;
        }

        for (const geometry of collection.geometries) {
            if (geometry.type !== "LineString") {
                continue;
            }

            const coords = geometry.coordinates as [number, number, number][];
            if (coords.length < 2) {
                continue;
            }

            let lastCoordinates = coords[0];
            for (let i = 1; i < coords.length - 2; i++) {
                const distance = Math.sqrt(
                    (coords[i][0] - lastCoordinates[0]) ** 2 + (coords[i][1] - lastCoordinates[1]) ** 2
                );

                if (distance < minDistance && i !== 1) {
                    continue;
                }

                const current = coords[i];
                const prev = coords[i - 1];
                const next = coords[i + 1];

                let angle = Math.atan2(prev[1] - next[1], prev[0] - next[0]) * (180 / Math.PI);

                if (angle < -90) {
                    angle += 180;
                }

                if (angle > 90) {
                    angle -= 180;
                }

                const bbox = makeBoundingBox([current[0], current[1]], name.length * 20, 20, angle);

                if (
                    labelCoords.some((label) => {
                        const otherBbox = makeBoundingBox(
                            [label.coords[0], label.coords[1]],
                            label.name.length * 20,
                            20,
                            label.angle
                        );

                        return (
                            bbox.x0 < otherBbox.x1 &&
                            bbox.x1 > otherBbox.x0 &&
                            bbox.y0 < otherBbox.y1 &&
                            bbox.y1 > otherBbox.y0
                        );
                    })
                ) {
                    continue;
                }

                labelCoords.push({
                    name,
                    wellboreUuid: uuid,
                    coords: [current[0], current[1], 0],
                    angle: angle,
                });

                lastCoordinates = coords[i];
            }
        }
    }

    return labelCoords;
}
