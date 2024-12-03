import {
    CompositeLayer,
    CompositeLayerProps,
    FilterContext,
    GetPickingInfoParams,
    Layer,
    PickingInfo,
    UpdateParameters,
} from "@deck.gl/core";
import { GeoJsonLayer, LineLayer, TextLayer } from "@deck.gl/layers";
import { Entity, ForceDirectedEntityPositioning } from "@lib/utils/ForceDirectedEntityPositioning";
import { EntityGroup, ProximityGrouping } from "@lib/utils/ProximityGrouping";

import { Feature } from "geojson";

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

export type LabelPickingInfo = PickingInfo & {
    additionalText?: string;
};

export class LabelLayer extends CompositeLayer<LabelLayerProps> {
    static layerName: string = "LabelLayer";

    // @ts-ignore
    state!: {
        adjustedData: ExtendedLabelData[];
        hoveredId: string | null;
        labelGroups: Map<number, EntityGroup<IntermediateLabelData>[]>;
        singleLabelGroups: Map<number, EntityGroup<IntermediateLabelData>[]>;
    };

    initializeState(): void {
        this.state = {
            adjustedData: [],
            hoveredId: null,
            labelGroups: new Map(),
            singleLabelGroups: new Map(),
        };
    }

    private collectLabelGroups(): IntermediateLabelData[] {
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

    private reduceCollidingLabels(labels: IntermediateLabelData[]): ExtendedLabelData[] {
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

    updateState(params: UpdateParameters<Layer<LabelLayerProps & Required<CompositeLayerProps>>>): void {
        if (!params.changeFlags.dataChanged) {
            return;
        }

        const labels = this.collectLabelGroups();

        let zoomLevel = 1;
        const grouping = new ProximityGrouping(labels);

        const labelGroupsMap: Map<number, EntityGroup<IntermediateLabelData>[]> = new Map();
        const singleLabelGroupsMap: Map<number, EntityGroup<IntermediateLabelData>[]> = new Map();

        for (let i = 0; i < 5; i++) {
            const result = grouping.groupEntities(100 / 2 ** zoomLevel);
            const singleLabelGroups = result.filter((el) => el.entities.length === 1);
            const multiLabelGroups = result.filter((el) => el.entities.length > 1);
            labelGroupsMap.set(
                zoomLevel,
                multiLabelGroups.map((el) => ({
                    ...el,
                    name: el.entities.length.toString(),
                    otherNames: el.entities.map((e) => e.name),
                }))
            );
            singleLabelGroupsMap.set(
                zoomLevel,
                singleLabelGroups.map((el) => ({ ...el, name: el.entities[0].name }))
            );
            zoomLevel -= 1;
        }
        const adjustedData = this.reduceCollidingLabels(labels);

        this.setState({
            ...this.state,
            adjustedData,
            labelGroups: labelGroupsMap,
            singleLabelGroups: singleLabelGroupsMap,
        });
    }

    filterSubLayer(context: FilterContext): boolean {
        const { labelGroups, singleLabelGroups } = this.state;

        if (context.layer.id === `${this.props.id}-text`) {
            return context.viewport.zoom > 2;
        }
        if (context.layer.id === `${this.props.id}-lines`) {
            return context.viewport.zoom > 2;
        }

        const reg = /(text|points)-zoom-([-\d\\.]+)/;
        const match = context.layer.id.match(reg);

        if (match) {
            const zoom = parseFloat(match[2]);
            const zoomLevels = Array.from(labelGroups.keys());
            const closestZoomLevel = zoomLevels.reduce((prev, curr) =>
                Math.abs(curr - context.viewport.zoom) < Math.abs(prev - context.viewport.zoom) ? curr : prev
            );
            return closestZoomLevel === zoom && context.viewport.zoom <= 2 && context.viewport.zoom > -4;
        }

        const reg2 = /text-single-zoom-([-\d\\.]+)/;
        const match2 = context.layer.id.match(reg2);

        if (match2) {
            const zoom = parseFloat(match2[1]);
            const zoomLevels = Array.from(singleLabelGroups.keys());
            const closestZoomLevel = zoomLevels.reduce((prev, curr) =>
                Math.abs(curr - context.viewport.zoom) < Math.abs(prev - context.viewport.zoom) ? curr : prev
            );
            return closestZoomLevel === zoom && context.viewport.zoom <= 2 && context.viewport.zoom > -4;
        }

        return true;
    }

    getPickingInfo(params: GetPickingInfoParams): LabelPickingInfo {
        const { adjustedData } = this.state;
        const info = super.getPickingInfo(params) as LabelPickingInfo;
        const { index, sourceLayer } = info;

        console.debug(info);

        if (index < 0) {
            return info;
        }

        const reg = /(text|points)-zoom-([-\d\\.]+)/;
        const match = info.sourceLayer?.id.match(reg);

        if (match) {
            const zoomLevel = parseFloat(match[2]);
            const labelGroup = this.state.labelGroups.get(zoomLevel);
            if (!labelGroup) {
                return info;
            }
            info.object.name = this.reduceNames([
                labelGroup[info.index].name,
                ...labelGroup[info.index].entities.map((e) => e.name),
            ]);
            return info;
        }

        if (sourceLayer) {
            const otherNames = adjustedData[index].otherNames;
            info.object.name = this.reduceNames([adjustedData[index].name, ...otherNames]);
        }
        return info;
    }

    onHover(info: LabelPickingInfo): boolean {
        const { adjustedData, hoveredId } = this.state;
        let newHoveredId: string | null;
        if (info.index < 0) {
            if (hoveredId === null) {
                return false;
            }

            newHoveredId = null;
            this.setState({ ...this.state, hoveredId: newHoveredId });
            return false;
        }

        const reg = /(text|points)-zoom-([-\d\\.]+)/;
        const match = info.sourceLayer?.id.match(reg);

        if (match) {
            const zoomLevel = parseFloat(match[2]);
            const labelGroup = this.state.labelGroups.get(zoomLevel);
            if (!labelGroup) {
                return false;
            }
            newHoveredId = this.makeZoomLevelGroupId(zoomLevel, labelGroup[info.index]);
            if (newHoveredId !== hoveredId) {
                this.setState({ ...this.state, hoveredId: newHoveredId });
            }
            return false;
        }

        newHoveredId = this.makeId(adjustedData[info.index]);
        if (newHoveredId !== hoveredId) {
            this.setState({ ...this.state, hoveredId: newHoveredId });
        }

        return false;
    }

    private makeId(labelData: ExtendedLabelData): string {
        return `${labelData.name}-${labelData.coordinates.join(",")}`;
    }

    private makeZoomLevelGroupId(zoomLevel: number, group: EntityGroup<IntermediateLabelData>): string {
        return `zoom-${zoomLevel}-${group.coordinates.join(",")}`;
    }

    private reduceNames(names: string[], maxNum: number = 5): string {
        const ellipsis = names.length > maxNum ? `\n... + ${names.length - maxNum} more` : "";
        const newNames = names.slice(0, Math.min(maxNum, names.length));
        return `${newNames.join("\n")}${ellipsis}`;
    }

    renderLayers() {
        const { adjustedData, singleLabelGroups, labelGroups, hoveredId } = this.state;
        const sizeMinPixels = 14;
        const sizeMaxPixels = 14;

        const zoomLayers: Layer<any>[] = [];

        for (const [zoomLevel, labelGroup] of labelGroups) {
            const featureCollection = {
                type: "FeatureCollection",
                features: labelGroup.map((d) => ({
                    id: this.makeZoomLevelGroupId(zoomLevel, d),
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: d.coordinates,
                    },
                    properties: {
                        name: this.reduceNames(d.entities.map((e) => e.name)),
                    },
                })),
            };
            zoomLayers.push(
                new GeoJsonLayer(
                    this.getSubLayerProps({
                        id: `points-zoom-${zoomLevel}`,
                        data: featureCollection,
                        getRadius: 100 / 2 ** zoomLevel,
                        getFillColor: (d: Feature) => {
                            if (hoveredId && d.id === hoveredId) {
                                return [20, 20, 255, 30];
                            }
                            return [255, 255, 255, 30];
                        },
                        stroked: false,
                        pickable: true,
                        pointRadiusUnits: "meters",
                        parameters: {
                            depthMask: false,
                        },
                        updateTriggers: {
                            getFillColor: [hoveredId],
                        },
                    })
                )
            );
            zoomLayers.push(
                new TextLayer(
                    this.getSubLayerProps({
                        id: `text-zoom-${zoomLevel}`,
                        data: labelGroup,
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
        for (const [zoomLevel, labelGroup] of singleLabelGroups) {
            zoomLayers.push(
                new TextLayer(
                    this.getSubLayerProps({
                        id: `text-single-zoom-${zoomLevel}`,
                        data: labelGroup,
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
                        sizeMaxPixels: 16,
                        fontSettings: {
                            sdf: true,
                        },
                    })
                )
            );
        }

        const featureCollection = {
            type: "FeatureCollection",
            features: adjustedData.map((d) => ({
                id: this.makeId(d),
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: d.anchorCoordinates,
                },
                properties: {
                    name: [d.name, ...d.otherNames].join("\n"),
                },
            })),
        };

        return [
            new LineLayer(
                this.getSubLayerProps({
                    id: "lines",
                    data: adjustedData,
                    getSourcePosition: (d: ExtendedLabelData) => d.anchorCoordinates,
                    getTargetPosition: (d: ExtendedLabelData) => d.coordinates,
                    getColor: (d: ExtendedLabelData) => {
                        if (hoveredId && this.makeId(d) === hoveredId) {
                            return [0, 0, 100, 255];
                        }
                        return [0, 0, 0, 255];
                    },
                    getWidth: (d: ExtendedLabelData) => {
                        if (hoveredId && this.makeId(d) === hoveredId) {
                            return 2;
                        }
                        return 1;
                    },
                    widthMaxPixels: 5,
                    sizeUnits: "pixels",
                    updateTriggers: {
                        getWidth: [hoveredId],
                        getColor: [hoveredId],
                    },
                })
            ),
            new GeoJsonLayer(
                this.getSubLayerProps({
                    id: `points`,
                    data: featureCollection,
                    getRadius: (d: any) => {
                        if (hoveredId && d.id === hoveredId) {
                            return 4;
                        }
                        return 3;
                    },
                    pointRadiusUnits: "pixels",
                    radiusUnits: "meters",
                    pointRadiusMaxPixels: 4,
                    pickable: true,
                    filled: true,
                    stroked: false,
                    autoHighlight: true,
                    getFillColor: (d: any) => {
                        if (hoveredId && d.id === hoveredId) {
                            return [0, 0, 255];
                        }
                        return [0, 0, 0];
                    },
                    updateTriggers: {
                        getRadius: [hoveredId],
                        getFillColor: [hoveredId],
                    },
                })
            ),
            new TextLayer(
                this.getSubLayerProps({
                    id: "text",
                    data: adjustedData,
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
                    getBackgroundColor: (d: ExtendedLabelData) => {
                        if (hoveredId && this.makeId(d) === hoveredId) {
                            return [0, 0, 255, 255];
                        }
                        return [0, 0, 0];
                    },
                    background: true,
                    updateTriggers: {
                        getBackgroundColor: [hoveredId],
                    },
                })
            ),
            ...zoomLayers,
        ];
    }
}
