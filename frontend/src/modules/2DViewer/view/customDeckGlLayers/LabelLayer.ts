import { CompositeLayer, FilterContext, GetPickingInfoParams, Layer, PickingInfo } from "@deck.gl/core";
import { LineLayer, TextLayer } from "@deck.gl/layers";
import { Entity, ForceDirectedEntityPositioning } from "@lib/utils/ForceDirectedEntityPositioning";
import { EntityGroup, ProximityGrouping } from "@lib/utils/ProximityGrouping";
import { PointsLayer } from "@webviz/subsurface-viewer/dist/layers";

type LabelData = {
    coordinates: [number, number, number];
    name: string;
};

interface IntermediateLabelData extends Entity {
    name: string;
    otherNames: string[];
}

type ExtendedLabelData = {
    name: string;
    otherNames: string[];
    coordinates: [number, number, number];
    anchorCoordinates: [number, number, number];
};

export type LabelLayerProps = {
    id: string;
    data: LabelData[];
    fontSize: number;
    sizeMinPixels: number;
    sizeMaxPixels: number;
};

type BoundingBox2D = {
    topLeft: number[];
    bottomRight: number[];
};

export type LabelPickingInfo = PickingInfo & {
    additionalText?: string;
};

export class LabelLayer extends CompositeLayer<LabelLayerProps> {
    static layerName: string = "LabelLayer";

    private _labelBoundingBoxes: (BoundingBox2D | null)[] = [];
    private _adjustedData: ExtendedLabelData[] = [];
    private _labelGroups: Map<number, EntityGroup<IntermediateLabelData>[]> = new Map();

    estimateLabelBoundingBoxes(): void {
        const viewport = this.context.viewport;
        const viewportBounds = viewport.getBounds();

        for (const label of this.props.data) {
            const [xWorld, yWorld] = label.coordinates;

            if (
                xWorld < viewportBounds[0] ||
                xWorld > viewportBounds[2] ||
                yWorld < viewportBounds[1] ||
                yWorld > viewportBounds[3]
            ) {
                this._labelBoundingBoxes.push(null);
                continue;
            }

            const [xScreen, yScreen] = viewport.project([xWorld, yWorld]);

            const numChars = label.name.length;
            const fontSize = this.props.fontSize ?? 16;
            const charWidth = fontSize / 1.5;
            const charHeight = fontSize;
            const labelWidth = numChars * charWidth;
            const labelHeight = charHeight;

            const topLeftScreen: [number, number] = [xScreen - labelWidth / 2, yScreen - labelHeight / 2];
            const bottomRightScreen: [number, number] = [xScreen + labelWidth / 2, yScreen + labelHeight / 2];

            const topLeftWorld = viewport.unproject(topLeftScreen);
            const bottomRightWorld = viewport.unproject(bottomRightScreen);

            this._labelBoundingBoxes.push({
                topLeft: topLeftWorld,
                bottomRight: bottomRightWorld,
            });
        }
    }

    collectLabelGroups(): IntermediateLabelData[] {
        const labelGroups: IntermediateLabelData[] = [];

        for (const label of this.props.data) {
            const [xWorld, yWorld] = label.coordinates;

            const group = labelGroups.find((group) => {
                const [xGroup, yGroup] = group.coordinates;

                return Math.abs(xGroup - xWorld) < 0.1 && Math.abs(yGroup - yWorld) < 0.1;
            });

            if (group) {
                group.otherNames.push(label.name);
            } else {
                labelGroups.push({
                    name: label.name,
                    coordinates: [xWorld, yWorld],
                    anchorCoordinates: [xWorld, yWorld],
                    otherNames: [],
                    chargeMagnitude: label.name.length,
                });
            }
        }

        return labelGroups;
    }

    reduceCollidingLabels(labels: IntermediateLabelData[]): ExtendedLabelData[] {
        const forceDirectedEntityPositioning = new ForceDirectedEntityPositioning(labels, {
            springRestLength: 10,
            springConstant: 0.2,
            chargeConstant: 3,
            tolerance: 0.1,
            maxIterations: 500,
        });

        const adjustedLabels = forceDirectedEntityPositioning.run();

        return adjustedLabels.map((label) => ({
            name: label.name,
            otherNames: label.otherNames,
            coordinates: [label.coordinates[0], label.coordinates[1], 0] as [number, number, number],
            anchorCoordinates: [label.anchorCoordinates[0], label.anchorCoordinates[1], 0] as [number, number, number],
        }));
    }

    updateState(): void {
        const labels = this.collectLabelGroups();

        let zoomLevel = 1;
        this._labelGroups.clear();
        const grouping = new ProximityGrouping(labels);

        for (let i = 0; i < 5; i++) {
            this._labelGroups.set(
                zoomLevel,
                grouping
                    .groupEntities(100 / 2 ** zoomLevel)
                    .map((el) => ({ ...el, name: el.entities?.length.toString() ?? el.name }))
            );
            zoomLevel -= 1;
        }
        this._adjustedData = this.reduceCollidingLabels(labels);
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id === `${this.props.id}-text`) {
            return context.viewport.zoom > 1;
        }
        if (context.layer.id === `${this.props.id}-lines`) {
            return context.viewport.zoom > 1;
        }

        const reg = /(text|points)-zoom-([-\d\\.]+)/;
        const match = context.layer.id.match(reg);

        if (match) {
            const zoom = parseFloat(match[2]);
            const zoomLevels = Array.from(this._labelGroups.keys());
            const closestZoomLevel = zoomLevels.reduce((prev, curr) =>
                Math.abs(curr - context.viewport.zoom) < Math.abs(prev - context.viewport.zoom) ? curr : prev
            );
            return closestZoomLevel === zoom && context.viewport.zoom <= 1;
        }

        return true;
    }

    getPickingInfo(params: GetPickingInfoParams): LabelPickingInfo {
        const info = super.getPickingInfo(params) as LabelPickingInfo;
        const { index, sourceLayer } = info;
        if (index >= 0 && sourceLayer) {
            info.object.name = `${this._adjustedData[index].name}\n${this._adjustedData[index].otherNames.join("\n")}`;
        }
        return info;
    }

    renderLayers() {
        const sizeMinPixels = 14;
        const sizeMaxPixels = 14;

        const zoomLayers: Layer<any>[] = [];

        for (const [zoomLevel, labelGroups] of this._labelGroups) {
            zoomLayers.push(
                new PointsLayer(
                    this.getSubLayerProps({
                        id: `points-zoom-${zoomLevel}`,
                        pointsData: labelGroups.flatMap((d) => [...d.coordinates, 0]),
                        pointRadius: 100 / 2 ** zoomLevel,
                        color: [255, 255, 255, 30],
                        radiusUnits: "meters",
                    })
                )
            );
            zoomLayers.push(
                new TextLayer(
                    this.getSubLayerProps({
                        id: `text-zoom-${zoomLevel}`,
                        data: labelGroups,
                        getPosition: (d: ExtendedLabelData) => d.coordinates,
                        getText: (d: ExtendedLabelData) => `${d.name}`,
                        getSize: 16,
                        getColor: [255, 255, 255],
                        getAngle: 0,
                        getPixelOffset: [0, 0],
                        fontWeight: 800,
                        getTextAnchor: "middle",
                        getAlignmentBaseline: "center",
                        pickable: true,
                        sizeScale: Math.abs(zoomLevel - 3) ** 2,
                        sizeUnits: "meters",
                        sizeMinPixels: sizeMinPixels,
                        sizeMaxPixels: 24,
                        fontSettings: {
                            sdf: true,
                        },
                    })
                )
            );
        }

        return [
            new PointsLayer(
                this.getSubLayerProps({
                    id: "points",
                    pointsData: this._adjustedData.flatMap((d) => d.anchorCoordinates),
                    pointRadius: 3,
                    color: [0, 0, 0],
                    radiusUnits: "pixels",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                })
            ),
            new LineLayer(
                this.getSubLayerProps({
                    id: "lines",
                    data: this._adjustedData,
                    getSourcePosition: (d: ExtendedLabelData) => d.anchorCoordinates,
                    getTargetPosition: (d: ExtendedLabelData) => d.coordinates,
                    getColor: [0, 0, 0],
                    getLineWidth: 1,
                    sizeUnits: "pixels",
                    collisionGroup: "label",
                    collisionTestProps: {
                        widthMaxPixels: 0.001,
                        widthMinPixels: 0.001,
                    },
                    collisionEnabled: true,
                    autoHighlight: true,
                })
            ),
            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: this._adjustedData,
                    getPosition: (d: ExtendedLabelData) => d.coordinates,
                    getText: (d: ExtendedLabelData) =>
                        `${d.name} ${d.otherNames.length > 0 ? `(+${d.otherNames.length})` : ""}`,
                    getSize: 12,
                    getColor: [255, 255, 255],
                    getAngle: 0,
                    getPixelOffset: [0, 0],
                    fontWeight: 800,
                    getTextAnchor: "middle",
                    getAlignmentBaseline: "center",
                    fontSettings: {
                        fontSize: 16,
                    },
                    pickable: true,
                    sizeScale: 1,
                    sizeUnits: "meters",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                    getBackgroundColor: [0, 0, 0, 255],
                    background: true,
                    autoHighlight: true,
                    highlightColor: [0, 0, 255, 255],
                })
            ),
            ...zoomLayers,
            /*
            new PolygonLayer(
                this.getSubLayerProps({
                    id: "bounding-boxes",
                    data: this._labelBoundingBoxes.filter((d) => d !== null) as BoundingBox2D[],
                    getPolygon: (d: BoundingBox2D) => [
                        [d.topLeft[0], d.topLeft[1]],
                        [d.bottomRight[0], d.topLeft[1]],
                        [d.bottomRight[0], d.bottomRight[1]],
                        [d.topLeft[0], d.bottomRight[1]],
                    ],
                    getLineColor: [255, 255, 255],
                    getFillColor: [255, 255, 255, 0],
                    getLineWidth: 5,
                    stroked: true,
                    sizeUnits: "pixels",
                })
            ),
            */
        ];
    }
}
