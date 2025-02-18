import { FilterContext, Layer, LayersList, UpdateParameters } from "@deck.gl/core";
import { GeoJsonLayer } from "@deck.gl/layers";
import { Vec3 } from "@modules/3DViewerNew/view/utils/AnnotationOrganizer/utils/definitions";
import { LabelAnnotation } from "@modules/3DViewerNew/view/utils/AnnotationOrganizer/utils/types";
import { WellsLayer } from "@webviz/subsurface-viewer/dist/layers";

import { FeatureCollection, GeometryCollection, LineString, Point } from "geojson";

export class AdvancedWellsLayer extends WellsLayer {
    static layerName: string = "WellsLayer";

    // @ts-expect-error - state must be initialized like this
    state!: {
        hoveredIndex: number;
    };

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("names")) {
            return context.viewport.zoom > -2;
        }

        return true;
    }

    updateState(params: UpdateParameters<any>): void {
        super.updateState(params);

        const { data } = this.props;

        const featureCollection = data as FeatureCollection;
        const annotations: LabelAnnotation[] = [];

        let index = 0;
        for (const feature of featureCollection.features) {
            const wellName = feature.properties?.name as string;
            const wellUuid = feature.properties?.uuid as string;
            const collection = feature.geometry as GeometryCollection;
            const [point, line] = collection.geometries;
            const startPoint = (point as Point).coordinates as number[];
            const endPoint = (line as LineString).coordinates[(line as LineString).coordinates.length - 1] as number[];
            let midPoints: number[][] = [];
            for (
                let i = 1;
                i < (line as LineString).coordinates.length - 1;
                i += Math.ceil((line as LineString).coordinates.length / 5)
            ) {
                midPoints.push((line as LineString).coordinates[i] as number[]);
            }

            const alternativePositions: Vec3[] = [];
            for (const midPoint of midPoints) {
                alternativePositions.push([midPoint[0], midPoint[1], midPoint[2]]);
            }
            alternativePositions.push([endPoint[0], endPoint[1], endPoint[2]]);

            annotations.push({
                id: wellUuid,
                type: "label",
                name: wellName,
                position: [startPoint[0], startPoint[1], -startPoint[2]],
                alternativePositions: alternativePositions,
                direction: [0, 0, 1],
                priority: 0,
                onMouseOver: () => {
                    this.setState({ hoveredIndex: index });
                },
                onMouseOut: () => {
                    this.setState({ hoveredIndex: -1 });
                },
            });

            index++;
        }

        // @ts-expect-error
        this.props.reportAnnotations?.(this.id, annotations);
    }

    renderLayers(): LayersList {
        const { hoveredIndex } = this.state;
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

        if (!(colorsLayer instanceof GeoJsonLayer)) {
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
            getLineColor: (_, ctx) => {
                if (hoveredIndex === ctx.index) {
                    return [0, 0, 255, 255];
                }
                return colorsLayer.props.getLineColor(_, ctx);
            },
            getFillColor: (_, ctx) => {
                if (hoveredIndex === ctx.index) {
                    return [0, 0, 255, 255];
                }
                return colorsLayer.props.getLineColor(_, ctx);
            },
            autoHighlight: true,
            updateTriggers: {
                getLineColor: [hoveredIndex],
                getFillColor: [hoveredIndex],
            },
        });

        return [newColorsLayer, ...layers.filter((layer) => layer !== colorsLayer)];
    }
}
