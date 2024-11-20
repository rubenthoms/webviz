import { CompositeLayer, FilterContext } from "@deck.gl/core";
import { LineLayer, TextLayer } from "@deck.gl/layers";
import { ForceDirectedEntityPositioning } from "@lib/utils/ForceDirectedEntityPositioning";
import { PointsLayer } from "@webviz/subsurface-viewer/dist/layers";

type LabelData = {
    coordinates: [number, number, number];
    name: string;
};

type IntermediateLabelData = {
    name: string;
    otherNames: string[];
    coordinates: [number, number];
    anchorCoordinates: [number, number];
};

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

export class LabelLayer extends CompositeLayer<LabelLayerProps> {
    static layerName: string = "LabelLayer";

    private _labelBoundingBoxes: (BoundingBox2D | null)[] = [];
    private _adjustedData: ExtendedLabelData[] = [];

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
                });
            }
        }

        return labelGroups;
    }

    reduceCollidingLabels(): ExtendedLabelData[] {
        const labels = this.collectLabelGroups();
        const forceDirectedEntityPositioning = new ForceDirectedEntityPositioning(labels, {
            springRestLength: 25,
            springConstant: 0.2,
            chargeConstant: 150,
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
        this._adjustedData = this.reduceCollidingLabels();
    }

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("text")) {
            return context.viewport.zoom > -2;
        }

        return true;
    }

    renderLayers() {
        const sizeMinPixels = 14;
        const sizeMaxPixels = 14;

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
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
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
                    outlineColor: [0, 0, 0],
                    outlineWidth: 2,
                    getAngle: 0,
                    getPixelOffset: [0, 0],
                    fontWeight: 800,
                    getTextAnchor: "middle",
                    getAlignmentBaseline: "center",
                    fontSettings: {
                        fontSize: 16,
                    },
                    sizeScale: 1,
                    sizeUnits: "meters",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                    getBackgroundColor: [0, 0, 0, 255],
                    background: true,
                })
            ),
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
