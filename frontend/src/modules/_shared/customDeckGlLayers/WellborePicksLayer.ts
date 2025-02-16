import { CompositeLayer, CompositeLayerProps, FilterContext, Layer, UpdateParameters } from "@deck.gl/core";
import { PointCloudLayer } from "@deck.gl/layers";
import { AnnotationOrganizer } from "@modules/3DViewerNew/view/utils/LabelOrganizer/AnnotationOrganizer";
import { ExtendedLayerProps } from "@webviz/subsurface-viewer";
import { BoundingBox3D, ReportBoundingBoxAction } from "@webviz/subsurface-viewer/dist/components/Map";

export type WellborePickLayerData = {
    easting: number;
    northing: number;
    wellBoreUwi: string;
    tvdMsl: number;
    md: number;
    slotName: string;
};

type TextLayerData = {
    coordinates: [number, number, number];
    name: string;
};

export interface WellBorePicksLayerProps extends ExtendedLayerProps {
    id: string;
    data: WellborePickLayerData[];
    zIncreaseDownwards?: boolean;

    // Non public properties:
    reportBoundingBox?: React.Dispatch<ReportBoundingBoxAction>;
    reportAnnotations?: AnnotationOrganizer["registerAnnotations"];
}

export class WellborePicksLayer extends CompositeLayer<WellBorePicksLayerProps> {
    static layerName: string = "WellborePicksLayer";

    // @ts-expect-error - state must be initialized like this
    state!: {
        hoveredIndex: number;
        pointsData: { coordinates: number[]; name: string; id: string }[];
    };

    filterSubLayer(context: FilterContext): boolean {
        if (context.layer.id.includes("text")) {
            return context.viewport.zoom > -4;
        }

        return true;
    }

    private calcBoundingBox(): BoundingBox3D {
        const { data } = this.props;

        let minX = Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let minZ = Number.MAX_VALUE;
        let maxX = Number.MIN_VALUE;
        let maxY = Number.MIN_VALUE;
        let maxZ = Number.MIN_VALUE;

        for (const wellPick of data) {
            minX = Math.min(minX, wellPick.easting);
            minY = Math.min(minY, wellPick.northing);
            minZ = Math.min(minZ, wellPick.tvdMsl);
            maxX = Math.max(maxX, wellPick.easting);
            maxY = Math.max(maxY, wellPick.northing);
            maxZ = Math.max(maxZ, wellPick.tvdMsl);
        }

        return [minX, minY, minZ, maxX, maxY, maxZ];
    }

    updateState(params: UpdateParameters<Layer<WellBorePicksLayerProps & Required<CompositeLayerProps>>>): void {
        const { zIncreaseDownwards } = this.props;
        const pointsData = params.props.data.map((wellPick) => {
            return {
                coordinates: [wellPick.easting, wellPick.northing, (zIncreaseDownwards ? -1.0 : 1.0) * wellPick.tvdMsl],
                name: `${wellPick.wellBoreUwi}, TVD_MSL: ${wellPick.tvdMsl}, MD: ${wellPick.md}`,
                id: `${wellPick.wellBoreUwi}_${wellPick.md}_${wellPick.tvdMsl}`,
            };
        });

        this.setState({
            hoveredIndex: -1,
            pointsData,
        });

        this.props.reportBoundingBox?.({
            layerBoundingBox: this.calcBoundingBox(),
        });

        this.props.reportAnnotations?.(
            this.id,
            this.props.data.map((wellPick, index) => {
                return {
                    id: `${wellPick.wellBoreUwi}_${wellPick.md}_${wellPick.tvdMsl}`,
                    name: wellPick.wellBoreUwi,
                    position: [
                        wellPick.easting,
                        wellPick.northing,
                        (zIncreaseDownwards ? -1.0 : 1.0) * wellPick.tvdMsl,
                    ],
                    priority: 0,
                    direction: [0, 0, 1],
                    onMouseOver: () => {
                        this.setState({ hoveredIndex: index });
                    },
                    onMouseOut: () => {
                        this.setState({ hoveredIndex: -1 });
                    },
                };
            })
        );
    }

    renderLayers() {
        const fontSize = 16;
        const sizeMinPixels = 16;
        const sizeMaxPixels = 16;

        const { hoveredIndex, pointsData } = this.state;

        return [
            new PointCloudLayer({
                id: "points",
                data: pointsData,
                getPosition: (d) => d.coordinates,
                getColor: (_, context) => {
                    if (context.index === hoveredIndex) {
                        return [0, 0, 255, 255];
                    }
                    return [255, 255, 255, 255];
                },
                pointSize: 10,
                pointSizeMinPixels: 10,
                sizeUnits: "meters",
                parameters: {
                    depthTest: false,
                },
                pickable: true,
                updateTriggers: {
                    getColor: [hoveredIndex],
                },
            }),

            /*
            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: this._textData,
                    pickable: true,
                    getColor: [255, 255, 255],
                    fontWeight: 800,
                    fontSettings: {
                        fontSize: fontSize * 2,
                        sdf: true,
                    },
                    outlineColor: [0, 0, 0],
                    outlineWidth: 2,
                    getSize: 12,
                    sdf: true,
                    sizeScale: fontSize,
                    sizeUnits: "meters",
                    sizeMinPixels: sizeMinPixels,
                    sizeMaxPixels: sizeMaxPixels,
                    getAlignmentBaseline: "top",
                    getTextAnchor: "middle",
                    getPosition: (d: TextLayerData) => d.coordinates,
                    getText: (d: TextLayerData) => d.name,
                    extensions: [
                        new CollisionFilterExtension({
                            collisionEnabled: true,
                        }),
                    ],
                })
            ),
            */
        ];
    }
}
