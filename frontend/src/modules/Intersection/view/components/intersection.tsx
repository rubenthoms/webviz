import React from "react";

import { BoundingBox3d_api, WellboreCasing_api } from "@api";
import { Casing, IntersectionReferenceSystem } from "@equinor/esv-intersection";
import { Button } from "@lib/components/Button";
import { HoldPressedIntervalCallbackButton } from "@lib/components/HoldPressedIntervalCallbackButton/holdPressedIntervalCallbackButton";
import { ColorScale } from "@lib/utils/ColorScale";
import { IntersectionType } from "@modules/Intersection/typesAndEnums";
import {
    EsvIntersection,
    EsvIntersectionReadoutEvent,
    LayerItem,
    LayerType,
} from "@modules/_shared/components/EsvIntersection";
import { CameraPosition, ZoomTransform } from "@modules/_shared/components/EsvIntersection/esvIntersection";
import {
    AdditionalInformationKey,
    HighlightItem,
    HighlightItemShape,
    ReadoutItem,
} from "@modules/_shared/components/EsvIntersection/types";
import { getColorFromLayerData } from "@modules/_shared/components/EsvIntersection/utils/intersectionConversion";
import {
    getAdditionalInformationFromReadoutItem,
    getLabelFromLayerData,
} from "@modules/_shared/components/EsvIntersection/utils/readoutItemUtils";
import { Add, FilterCenterFocus, Remove } from "@mui/icons-material";

import { isEqual } from "lodash";

import { PolylineIntersection_trans } from "../queries/queryDataTransforms";

export type IntersectionProps = {
    referenceSystem: IntersectionReferenceSystem | null;
    polylineIntersectionData: PolylineIntersection_trans | null;
    wellboreCasingData: WellboreCasing_api[] | null;
    gridBoundingBox3d: BoundingBox3d_api | null;
    colorScale: ColorScale;
    showGridLines: boolean;
    intersectionExtensionLength: number;
    hoveredMd: number | null;
    zoomTransform?: ZoomTransform;
    onReadout: (event: EsvIntersectionReadoutEvent) => void;
    onCameraPositionChange?: (cameraPosition: CameraPosition) => void;
    intersectionType: IntersectionType;
    verticalScale?: number;
};

export function Intersection(props: IntersectionProps): React.ReactNode {
    const { onReadout, onCameraPositionChange } = props;

    const [readoutItems, setReadoutItems] = React.useState<ReadoutItem[]>([]);
    const [verticalScale, setVerticalScale] = React.useState<number>(props.verticalScale ?? 1);
    const [prevIntersectionData, setPrevIntersectionData] = React.useState<PolylineIntersection_trans | null>(null);
    const [prevVerticalScale, setPrevVerticalScale] = React.useState<number | undefined>(props.verticalScale);

    if (!isEqual(prevVerticalScale, props.verticalScale)) {
        setPrevVerticalScale(props.verticalScale);
        if (props.verticalScale) {
            setVerticalScale(props.verticalScale);
        }
    }

    const layers: LayerItem[] = [];

    if (props.intersectionType === IntersectionType.WELLBORE) {
        layers.push({
            id: "wellbore-path",
            type: LayerType.WELLBORE_PATH,
            hoverable: true,
            options: {
                stroke: "red",
                strokeWidth: "2",
                order: 6,
            },
        });
    }

    if (props.polylineIntersectionData) {
        layers.push({
            id: "intersection",
            type: LayerType.POLYLINE_INTERSECTION,
            hoverable: true,
            options: {
                data: {
                    fenceMeshSections: props.polylineIntersectionData.fenceMeshSections.map((section) => {
                        let zMin = Number.MAX_VALUE;
                        let zMax = Number.MIN_VALUE;

                        const verticesUzArray: Float32Array = new Float32Array(section.verticesUzFloat32Arr.length);

                        for (let i = 0; i < section.verticesUzFloat32Arr.length; i += 2) {
                            const z = -section.verticesUzFloat32Arr[i + 1];
                            zMin = Math.min(zMin, z);
                            zMax = Math.max(zMax, z);
                            verticesUzArray[i] = section.verticesUzFloat32Arr[i];
                            verticesUzArray[i + 1] = z;
                        }

                        return {
                            polyIndicesArr: section.polyIndicesUintArr,
                            verticesUzArr: verticesUzArray,
                            verticesPerPolyArr: section.verticesPerPolyUintArr,
                            polySourceCellIndicesArr: section.polySourceCellIndicesUint32Arr,
                            polyPropsArr: section.polyPropsFloat32Arr,
                            minZ: zMin,
                            maxZ: zMax,
                            startUtmX: section.start_utm_x,
                            startUtmY: section.start_utm_y,
                            endUtmX: section.end_utm_x,
                            endUtmY: section.end_utm_y,
                        };
                    }),
                    minGridPropValue: props.polylineIntersectionData.min_grid_prop_value,
                    maxGridPropValue: props.polylineIntersectionData.max_grid_prop_value,
                    colorScale: props.colorScale,
                    hideGridlines: !props.showGridLines,
                    extensionLengthStart: props.intersectionExtensionLength,
                },
                order: 5,
            },
        });
    }

    if (props.wellboreCasingData) {
        const casingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Casing");
        const tubingData = props.wellboreCasingData.filter((casing) => casing.item_type === "Tubing");

        const casings: Casing[] = casingData.map((casing, index) => ({
            id: `casing-${index}`,
            diameter: casing.diameter_numeric,
            start: casing.depth_top_md,
            end: casing.depth_bottom_md,
            innerDiameter: casing.diameter_inner,
            kind: "casing",
            hasShoe: false,
        }));

        if (props.intersectionType === IntersectionType.WELLBORE) {
            layers.push({
                id: "schematic",
                type: LayerType.SCHEMATIC,
                hoverable: true,
                options: {
                    data: {
                        holeSizes: [],
                        casings,
                        cements: [],
                        completion: [],
                        pAndA: [],
                        symbols: {},
                        perforations: [],
                    },
                    order: 7,
                },
            });
        }
    }

    const newViewport: [number, number, number] = [0, 0, 0];
    if (props.referenceSystem) {
        const firstPoint = props.referenceSystem.projectedPath[0];
        const lastPoint = props.referenceSystem.projectedPath[props.referenceSystem.projectedPath.length - 1];
        const xMax = Math.max(firstPoint[0], lastPoint[0]);
        const xMin = Math.min(firstPoint[0], lastPoint[0]);
        const yMax = Math.max(firstPoint[1], lastPoint[1]);
        const yMin = Math.min(firstPoint[1], lastPoint[1]);

        newViewport[0] = xMin + (xMax - xMin) / 2;
        newViewport[1] = yMin + (yMax - yMin) / 2;
        newViewport[2] = Math.max(xMax - xMin, yMax - yMin) * 5;
    }

    const handleReadoutItemsChange = React.useCallback(
        function handleReadoutItemsChange(event: EsvIntersectionReadoutEvent): void {
            setReadoutItems(event.readoutItems);
            onReadout(event);
        },
        [onReadout, props.polylineIntersectionData]
    );

    const highlightItems: HighlightItem[] = [];
    if (props.referenceSystem && props.hoveredMd) {
        const point = props.referenceSystem.project(props.hoveredMd);
        highlightItems.push({
            point: [point[0], point[1]],
            color: "red",
            shape: HighlightItemShape.POINT,
        });
    }

    function handleVerticalScaleIncrease() {
        setVerticalScale((prev) => prev + 0.1);
    }

    function handleVerticalScaleDecrease() {
        setVerticalScale((prev) => Math.max(0.1, prev - 0.1));
    }

    const handleCameraPositionChange = React.useCallback(
        function handleCameraPositionChange(cameraPosition: CameraPosition) {
            if (onCameraPositionChange) {
                onCameraPositionChange(cameraPosition);
            }
        },
        [onCameraPositionChange]
    );

    return (
        <div className="relative h-full mr-20">
            <EsvIntersection
                showGrid
                zFactor={verticalScale}
                intersectionReferenceSystem={props.referenceSystem ?? undefined}
                showAxes
                layers={layers}
                bounds={{
                    x: [props.gridBoundingBox3d?.xmin ?? 0, props.gridBoundingBox3d?.xmax ?? 1],
                    y: [props.gridBoundingBox3d?.ymin ?? 0, props.gridBoundingBox3d?.ymax ?? 1],
                }}
                viewport={newViewport}
                transform={props.zoomTransform}
                intersectionThreshold={50}
                highlightItems={highlightItems}
                onReadout={handleReadoutItemsChange}
                onCameraPositionChange={handleCameraPositionChange}
            />
            <ReadoutBox readoutItems={readoutItems} />
            <Toolbar
                visible
                zFactor={verticalScale}
                onFitInView={() => {}}
                onVerticalScaleIncrease={handleVerticalScaleIncrease}
                onVerticalScaleDecrease={handleVerticalScaleDecrease}
            />
        </div>
    );
}

export type ReadoutBoxProps = {
    readoutItems: ReadoutItem[];
};

function additionalInformationItemToReadableString(key: string, value: unknown): string {
    switch (key) {
        case AdditionalInformationKey.CELL_INDEX:
            return `Cell index: ${(value as number).toFixed(0)}`;
        case AdditionalInformationKey.PROP_VALUE:
            return `Property value: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.MD:
            return `MD: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.MAX:
            return `Max: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.MIN:
            return `Min: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.P10:
            return `P10: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.P90:
            return `P90: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.P50:
            return `P50: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.MEAN:
            return `Mean: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.SCHEMATIC_INFO:
            return (value as string[]).join(", ");
        case AdditionalInformationKey.X:
            return `X: ${(value as number).toFixed(2)}`;
        case AdditionalInformationKey.Y:
            return `Y: ${(value as number).toFixed(2)}`;
        default:
            return "";
    }
}

function makeAdditionalInformation(item: ReadoutItem): React.ReactNode {
    const additionalInformation = getAdditionalInformationFromReadoutItem(item);
    return Object.entries(additionalInformation).map(([key, value], index) => {
        return (
            <span key={index} className="block">
                {additionalInformationItemToReadableString(key, value)}
            </span>
        );
    });
}

function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    if (props.readoutItems.length === 0) {
        return null;
    }

    return (
        <div className="absolute rounded border-2 border-neutral-300 bottom-10 left-0 bg-white p-2 flex flex-col gap-2 text-sm z-50 w-60 pointer-events-none">
            {props.readoutItems.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="rounded-full w-3 h-3"
                        style={{ backgroundColor: getColorFromLayerData(item.layer, item.index) }}
                    />
                    <div>
                        <strong>{getLabelFromLayerData(item)}</strong>
                        <br />
                        {makeAdditionalInformation(item)}
                    </div>
                </div>
            ))}
        </div>
    );
}

type ToolbarProps = {
    visible: boolean;
    zFactor: number;
    onFitInView: () => void;
    onVerticalScaleIncrease: () => void;
    onVerticalScaleDecrease: () => void;
};

function Toolbar(props: ToolbarProps): React.ReactNode {
    function handleFitInViewClick() {
        props.onFitInView();
    }

    function handleVerticalScaleIncrease() {
        props.onVerticalScaleIncrease();
    }

    function handleVerticalScaleDecrease() {
        props.onVerticalScaleDecrease();
    }

    if (!props.visible) {
        return null;
    }

    return (
        <div className="absolute -right-20 top-0 bg-white p-1 rounded border-gray-300 border shadow z-30 text-sm flex flex-col gap-1 items-center">
            <Button onClick={handleFitInViewClick} title="Focus top view">
                <FilterCenterFocus fontSize="inherit" />
            </Button>
            <ToolBarDivider />
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleIncrease}
                title="Increase vertical scale"
            >
                <Add fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
            <span title="Vertical scale">{props.zFactor.toFixed(2)}</span>
            <HoldPressedIntervalCallbackButton
                onHoldPressedIntervalCallback={handleVerticalScaleDecrease}
                title="Decrease vertical scale"
            >
                <Remove fontSize="inherit" />
            </HoldPressedIntervalCallbackButton>
        </div>
    );
}

function ToolBarDivider(): React.ReactNode {
    return <div className="w-full h-[1px] bg-gray-300" />;
}
