import {
    CompositeLayer,
    CompositeLayerProps,
    FilterContext,
    GetPickingInfoParams,
    Layer,
    LayersList,
    PickingInfo,
    UpdateParameters,
} from "@deck.gl/core";
import { GeoJsonLayer, LineLayer, PointCloudLayer, TextLayer } from "@deck.gl/layers";
import { Entity, ForceDirectedEntityPositioning } from "@lib/utils/ForceDirectedEntityPositioning";
import { Vec2, rotatePoint2Around } from "@lib/utils/vec2";

import { Feature, FeatureCollection, GeometryCollection, LineString, Position } from "geojson";

export type WellsLayerProps = {
    pointRadiusScale?: number;
    lineWidth?: number;
    lineWidthScale?: number;
    data: FeatureCollection;
    visible?: boolean;
};

export type WellsLayerPickingInfo = PickingInfo & {
    wellboreUuid: string;
    name: string;
    tvd: number;
    md: number;
};

const defaultProps: Partial<WellsLayerProps> = {
    pointRadiusScale: 1,
    lineWidth: 1,
    lineWidthScale: 1,
    visible: true,
};

export class AdvancedWellsLayer extends CompositeLayer<WellsLayerProps> {
    static layerName: string = "WellsLayer";
    static defaultProps = defaultProps;

    // @ts-ignore
    state!: {
        labelCoordsMap: Map<number, WellboreLabelCoords[]>;
        hoveredWellboreUuid: string | null;
        activeWellboreUuid: string | null;
        hoveredMd: number | null;
    };

    constructor(props: any) {
        super(props);
    }

    filterSubLayer(context: FilterContext): boolean {
        const { labelCoordsMap } = this.state;

        const reg = /(names|points|lines)-zoom-([-\d\\.]+)/;
        const match = context.layer.id.match(reg);

        if (match) {
            const zoom = parseFloat(match[2]);
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
            const labelCoords = precalculateLabelPositions(this.props.data as FeatureCollection, 300 * 2 ** z);

            const forceDirectedEntityPositioning = new ForceDirectedEntityPositioning(labelCoords, {
                springRestLength: 20,
                springConstant: 0.01,
                chargeConstant: 100 ** -z,
                tolerance: 0.1,
                maxIterations: 50,
            });

            const adjustedLabelCoords = forceDirectedEntityPositioning.run();

            labelCoordsMap.set(z, adjustedLabelCoords);
        }

        return labelCoordsMap;
    }

    updateState(params: UpdateParameters<Layer<WellsLayerProps & Required<CompositeLayerProps>>>): void {
        if (!params.changeFlags.dataChanged) {
            return;
        }

        const labelCoordsMap = this.makeLabelData();
        this.setState({ labelCoordsMap });
    }

    initializeState(): void {
        this.setState({
            labelCoords: new Map(),
            hoveredWellboreUuid: null,
            activeWellboreUuid: null,
        });
    }

    getPickingInfo(params: GetPickingInfoParams): WellsLayerPickingInfo {
        const info = super.getPickingInfo(params) as WellsLayerPickingInfo;
        const { index, sourceLayer } = info;

        if (index < 0 || !sourceLayer) {
            return info;
        }

        const coordinate = info.coordinate;
        if (!coordinate) {
            return info;
        }

        if (sourceLayer.id.includes("names") && sourceLayer instanceof TextLayer) {
            const wellboreUuid = sourceLayer.props.data[index].wellboreUuid;
            const name = sourceLayer.props.data[index].name;
            return {
                ...info,
                wellboreUuid,
                name,
                md: this.getMd(info.object, coordinate) ?? 0,
            };
        }

        const wellbore = this.props.data.features[index];
        const wellboreUuid = wellbore.properties?.uuid;
        const name = wellbore.properties?.name;

        if (!wellboreUuid || !name) {
            return info;
        }

        return {
            ...info,
            wellboreUuid,
            name,
            md: this.getMd(info.object, coordinate) ?? 0,
        };
    }

    onHover(info: WellsLayerPickingInfo): boolean {
        if (info.object) {
            this.setState({ hoveredWellboreUuid: info.wellboreUuid, hoveredMd: info.md });
        } else {
            this.setState({ hoveredWellboreUuid: null, hoveredMd: null });
        }

        return false;
    }

    onClick(info: WellsLayerPickingInfo): boolean {
        if (info.object) {
            this.setState({ activeWellboreUuid: info.wellboreUuid });
        } else {
            this.setState({ activeWellboreUuid: null });
        }

        return false;
    }

    private getWellTrajectory(well: Feature): Position[] | null {
        return (
            ((well.geometry as GeometryCollection)?.geometries.find((el) => el.type === "LineString") as LineString)
                .coordinates ?? null
        );
    }

    private getClosestSegmentIndex(trajectory: Position[], coord: Position): number {
        let minDistance = Infinity;
        let closestSegmentIndex = -1;

        for (let i = 0; i < trajectory.length - 1; i++) {
            const a = trajectory[i];
            const b = trajectory[i + 1];

            const distance = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
            const t = ((coord[0] - a[0]) * (b[0] - a[0]) + (coord[1] - a[1]) * (b[1] - a[1])) / distance ** 2;
            const x = a[0] + t * (b[0] - a[0]);
            const y = a[1] + t * (b[1] - a[1]);

            const dx = x - coord[0];
            const dy = y - coord[1];

            const dist = Math.sqrt(dx ** 2 + dy ** 2);

            if (dist < minDistance) {
                minDistance = dist;
                closestSegmentIndex = i;
            }
        }

        return closestSegmentIndex;
    }

    private interpolateDataOnTrajectory(trajectory: Position[], data: number[], coord: Position): number {
        if (data.length <= 1 || data.length !== trajectory.length) {
            return -1;
        }

        const closestSegmentIndex = this.getClosestSegmentIndex(trajectory, coord);

        if (closestSegmentIndex === -1) {
            return -1;
        }

        const a = trajectory[closestSegmentIndex];
        const b = trajectory[closestSegmentIndex + 1];

        const distance = Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2);
        const t = ((coord[0] - a[0]) * (b[0] - a[0]) + (coord[1] - a[1]) * (b[1] - a[1])) / distance ** 2;

        return data[closestSegmentIndex] + t * (data[closestSegmentIndex + 1] - data[closestSegmentIndex]);
    }

    private getMd(feature: Feature, coord: Position): number | null {
        if (!feature.properties?.md || !feature.geometry) {
            return null;
        }

        const mds = feature.properties.md as number[];
        const trajectory = this.getWellTrajectory(feature);

        if (!trajectory) {
            return null;
        }

        return this.interpolateDataOnTrajectory(trajectory, mds, coord);
    }

    renderLayers(): LayersList {
        const { hoveredWellboreUuid, activeWellboreUuid, hoveredMd } = this.state;

        const layers: Layer[] = [];

        layers.push(
            new GeoJsonLayer({
                data: this.props.data,
                pickable: true,
                stroked: false,
                pointRadiusUnits: "meters",
                lineWidthUnits: "meters",
                pointRadiusScale: this.props.pointRadiusScale,
                lineWidthScale: this.props.lineWidthScale,
                getLineWidth: (d: Feature) => {
                    if (activeWellboreUuid === d.properties?.uuid) {
                        return d.properties.lineWidth * 2;
                    }
                    return this.props.lineWidth!;
                },
                lineBillboard: true,
                pointBillboard: true,
                visible: this.props.visible,
                id: "colors",
                lineWidthMinPixels: 1,
                lineWidthMaxPixels: 7,
                getLineColor: (d: Feature) => {
                    if (activeWellboreUuid === d.properties?.uuid) {
                        return [0, 173, 230, 255];
                    }
                    if (hoveredWellboreUuid === d.properties?.uuid) {
                        return [255, 100, 0, 255];
                    }
                    return [0, 0, 0, 255];
                },
                updateTriggers: {
                    getLineColor: [hoveredWellboreUuid, activeWellboreUuid],
                    getLineWidth: [activeWellboreUuid],
                },
            })
        );

        layers.push(
            new PointCloudLayer({
                id: "highlight-md",
                getPosition: () => {
                    return hoveredMd ?? [0, 0, 0];
                },
            })
        );

        layers.push(
            new GeoJsonLayer({
                data: this.props.data,
                pickable: true,
                stroked: false,
                pointRadiusUnits: "meters",
                lineWidthUnits: "meters",
                pointRadiusScale: this.props.pointRadiusScale,
                lineWidthScale: this.props.lineWidthScale,
                getLineWidth: (d: Feature) => {
                    if (activeWellboreUuid === d.properties?.uuid) {
                        return d.properties.lineWidth * 5;
                    }
                    if (hoveredWellboreUuid === d.properties?.uuid) {
                        return d.properties.lineWidth * 3;
                    }
                    return this.props.lineWidth!;
                },
                lineBillboard: true,
                pointBillboard: true,
                visible: this.props.visible,
                id: "highlight",
                lineWidthMinPixels: 1,
                lineWidthMaxPixels: 5,
                getLineColor: (d: Feature) => {
                    if (activeWellboreUuid === d.properties?.uuid) {
                        return [0, 173, 230, 255];
                    }
                    if (hoveredWellboreUuid === d.properties?.uuid) {
                        return [120, 120, 230, 255];
                    }
                    return [0, 0, 0, 0];
                },
                updateTriggers: {
                    getLineColor: [hoveredWellboreUuid, activeWellboreUuid],
                    getLineWidth: [activeWellboreUuid],
                },
            })
        );

        for (const [zoom, labelCoords] of this.state.labelCoordsMap) {
            layers.push(
                new LineLayer(
                    this.getSubLayerProps({
                        id: `lines-zoom-${zoom}`,
                        data: labelCoords,
                        getSourcePosition: (d: WellboreLabelCoords) => d.anchorCoordinates,
                        getTargetPosition: (d: WellboreLabelCoords) => d.coordinates,
                        getColor: () => {
                            return [0, 0, 0, 255];
                        },
                        getWidth: () => {
                            return 1;
                        },
                        widthMaxPixels: 5,
                        sizeUnits: "pixels",
                    })
                )
            );

            layers.push(
                new TextLayer({
                    id: `names-zoom-${zoom}`,
                    data: labelCoords,
                    getColor: [0, 0, 0],
                    getBorderColor: [0, 173, 230],
                    getBorderWidth: 0,
                    getPosition: (d: WellboreLabelCoords) => d.coordinates,
                    getText: (d: WellboreLabelCoords) => d.name,
                    getSize: 16,
                    getAngle: (d: WellboreLabelCoords) => d.angle,
                    billboard: false,
                    background: true,
                    backgroundPadding: [1, 0],
                    fontFamily: "monospace",
                    collisionEnabled: true,
                    sizeUnits: "meters",
                    sizeMaxPixels: 20,
                    sizeMinPixels: 12,
                    pickable: true,
                    getBackgroundColor: (d: WellboreLabelCoords) => {
                        if (activeWellboreUuid === d.wellboreUuid) {
                            return [0, 173, 230, 255];
                        }
                        if (hoveredWellboreUuid === d.wellboreUuid) {
                            return [173, 173, 230, 255];
                        }
                        return [255, 255, 255, 100];
                    },
                    updateTriggers: {
                        getBackgroundColor: [hoveredWellboreUuid, activeWellboreUuid],
                    },
                })
            );
        }
        return layers;
    }
}

type WellboreLabelCoords = Entity & {
    wellboreUuid: string;
    name: string;
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
            if (coords.length < 3) {
                continue;
            }

            const i = coords.length - 2;
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
                anchorCoordinates: [current[0], current[1]],
                coordinates: [current[0], current[1]],
                angle: angle,
            });
            continue;

            let lastCoordinates = coords[0];
            for (let i = 1; i < coords.length - 2; i++) {
                const distance = Math.sqrt(
                    (coords[i][0] - lastCoordinates[0]) ** 2 + (coords[i][1] - lastCoordinates[1]) ** 2
                );

                if (distance < minDistance && i !== coords.length - 3) {
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
                            [label.coordinates[0], label.coordinates[1]],
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
                    anchorCoordinates: [current[0], current[1]],
                    coordinates: [current[0], current[1]],
                    angle: angle,
                });

                lastCoordinates = coords[i];
            }
        }
    }

    return labelCoords;
}
