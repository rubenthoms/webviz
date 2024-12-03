import { FilterContext, Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { CollisionFilterExtension } from "@deck.gl/extensions";
import { GeoJsonLayer, TextLayer } from "@deck.gl/layers";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { FeatureCollection, GeometryCollection } from "geojson";

export class AdvancedWellsLayer extends WellsLayer {
    static layerName: string = "WellsLayer";

    // @ts-ignore
    state!: {
        labelCoords: WellboreLabelCoords[];
    };

    constructor(props: any) {
        super(props);
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("names")) {
            return context.viewport.zoom > -3;
        }

        return true;
    }

    updateState(params: UpdateParameters<WellsLayer>): void {
        super.updateState(params);

        if (!params.changeFlags.dataChanged) {
            return;
        }

        const labelCoords = precalculateLabelPositions(params.props.data as FeatureCollection);
        this.setState({ labelCoords });
    }

    initializeState(): void {
        super.initializeState();

        this.setState({
            labelCoords: precalculateLabelPositions(this.props.data as FeatureCollection),
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

        const newTextLayer = new TextLayer({
            id: "names",
            data: this.state.labelCoords,
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
            sizeMinPixels: 8,
            extensions: [new CollisionFilterExtension()],
        });

        return [
            newColorsLayer,
            ...layers.filter((layer) => layer !== colorsLayer && layer !== textLayer),
            newTextLayer,
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

                if (distance < minDistance) {
                    continue;
                }

                if (
                    labelCoords.some(
                        (label) =>
                            label.coords[0] - minDistance / 5 <= coords[i][0] &&
                            label.coords[0] + minDistance / 5 >= coords[i][0] &&
                            label.coords[1] - minDistance / 5 <= coords[i][1] &&
                            label.coords[1] + minDistance / 5 >= coords[i][1]
                    )
                ) {
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
