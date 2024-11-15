import React from "react";

import { Vec2 } from "@lib/utils/vec2";
import { ReadoutBox, ReadoutItem } from "@modules/_shared/components/ReadoutBox";

import { isEqual } from "lodash";

import { LayerPickingInfo } from "../utils/MultiViewPickingInfoAssembler";

// Needs extra distance for the left side; this avoids overlapping with legend elements
const READOUT_EDGE_DISTANCE_REM = { left: 6 };

function makePositionReadout(position: Vec2 | null): ReadoutItem | null {
    if (!position) {
        return null;
    }
    return {
        label: "Position",
        info: [
            {
                name: "x",
                value: position.x,
                unit: "m",
            },
            {
                name: "y",
                value: position.y,
                unit: "m",
            },
        ],
    };
}

export type ReadoutBoxWrapperProps = {
    position: Vec2 | null;
    layerPickInfo: LayerPickingInfo[];
    maxNumItems?: number;
    visible?: boolean;
};

export function ReadoutBoxWrapper(props: ReadoutBoxWrapperProps): React.ReactNode {
    const [infoData, setInfoData] = React.useState<ReadoutItem[]>([]);
    const [prevLayerPickInfo, setPrevLayerPickInfo] = React.useState<LayerPickingInfo[]>([]);
    const [prevPosition, setPrevPosition] = React.useState<Vec2 | null>(null);

    if (!isEqual(props.layerPickInfo, prevLayerPickInfo) || !isEqual(props.position, prevPosition)) {
        setPrevLayerPickInfo(props.layerPickInfo);
        setPrevPosition(props.position);

        const newReadoutItems: ReadoutItem[] = [];

        if (!props.layerPickInfo || props.layerPickInfo.length === 0) {
            setInfoData([]);
            return;
        }

        const positionReadout = makePositionReadout(props.position);
        if (!positionReadout) {
            return;
        }
        newReadoutItems.push(positionReadout);

        for (const layerPickInfo of props.layerPickInfo) {
            const layerName = layerPickInfo.layerName;

            // pick info can have 2 types of properties that can be displayed on the info card
            // 1. defined as propertyValue, used for general layer info (now using for positional data)
            // 2. Another defined as array of property object described by type PropertyDataType

            let layerReadout = newReadoutItems.find((item) => item.label === layerName);

            if (!layerReadout) {
                newReadoutItems.push({
                    label: layerName,
                    info: [],
                });

                layerReadout = newReadoutItems[newReadoutItems.length - 1];
            }

            for (const property of layerPickInfo.properties) {
                layerReadout.info.push(property);
            }

            /*
            // collecting card data for 1st type
            const zValue = (layerPickInfo as LayerPickInfo).propertyValue;
            if (zValue !== undefined) {
                if (layerReadout) {
                    layerReadout.info.push({
                        name: "Property value",
                        value: zValue,
                    });
                } else {
                    newReadoutItems.push({
                        label: layerName ?? "Unknown layer",
                        info: [
                            {
                                name: "Property value",
                                value: zValue,
                            },
                        ],
                    });
                }
            }

            // collecting card data for 2nd type
            if (!layerProps || layerProps.length === 0) {
                continue;
            }
            if (layerReadout) {
                layerProps?.forEach((prop) => {
                    const property = layerReadout.info?.find((item) => item.name === prop.name);
                    if (property) {
                        property.value = prop.value;
                    } else {
                        layerReadout.info.push(prop);
                    }
                });
            } else {
                newReadoutItems.push({
                    label: layerName ?? "Unknown layer",
                    info: layerProps,
                });
            }
                */
        }

        setInfoData(newReadoutItems);
    }

    if (!props.visible) {
        return null;
    }

    return (
        <ReadoutBox
            readoutItems={infoData}
            maxNumItems={props.maxNumItems}
            edgeDistanceRem={READOUT_EDGE_DISTANCE_REM}
        />
    );
}
