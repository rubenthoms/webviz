import { AdditionalInformationKey, ReadoutItem } from "../types";
import { getColorFromLayerData } from "../utils/intersectionConversion";
import { getAdditionalInformationFromReadoutItem, getLabelFromLayerData } from "../utils/readoutItemUtils";

export type ReadoutBoxProps = {
    readoutItems: ReadoutItem[];
    maxNumItems?: number;
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

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    if (props.readoutItems.length === 0) {
        return null;
    }

    return (
        <div className="absolute rounded border-2 border-neutral-300 bottom-10 right-20 bg-white bg-opacity-75 p-2 flex flex-col gap-2 text-sm z-50 w-60 pointer-events-none">
            {props.readoutItems.map((item, index) => {
                if (index < (props.maxNumItems ?? 3)) {
                    return (
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
                    );
                }
            })}
            {props.readoutItems.length > (props.maxNumItems ?? 3) && (
                <div className="flex items-center gap-2">
                    ...and {props.readoutItems.length - (props.maxNumItems ?? 3)} more
                </div>
            )}
        </div>
    );
}
