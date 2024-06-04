import { AdditionalInformationKey, PropValue, ReadoutItem } from "../types";
import { getColorFromLayerData } from "../utils/intersectionConversion";
import { getAdditionalInformationFromReadoutItem, getLabelFromLayerData } from "../utils/readoutItemUtils";

export type ReadoutBoxProps = {
    readoutItems: ReadoutItem[];
    maxNumItems?: number;
};

function additionalInformationItemToReadableString(
    key: string,
    value: unknown
): { label: string; value: string } | null {
    switch (key) {
        case AdditionalInformationKey.IJK:
            return {
                label: "IJK",
                value: `${(value as [number, number, number])[0].toFixed(0)}, ${(
                    value as [number, number, number]
                )[1].toFixed(0)}, ${(value as [number, number, number])[2].toFixed(0)}`,
            };
        case AdditionalInformationKey.PROP_VALUE:
            const propValue = value as PropValue;
            return {
                label: propValue.name,
                value: `${propValue.value.toFixed(2)} ${propValue.unit}`,
            };
        case AdditionalInformationKey.MD:
            return {
                label: "MD",
                value: `${(value as number).toFixed(2)} m`,
            };
        case AdditionalInformationKey.MAX:
            return {
                label: "Max",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.MIN:
            return {
                label: "Min",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.P10:
            return {
                label: "P10",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.P90:
            return {
                label: "P90",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.P50:
            return {
                label: "P50",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.MEAN:
            return {
                label: "Mean",
                value: `${(value as number).toFixed(2)}`,
            };
        case AdditionalInformationKey.SCHEMATIC_INFO:
            return {
                label: "Schematic info",
                value: (value as string[]).join(", "),
            };
        case AdditionalInformationKey.X:
            return {
                label: "X",
                value: `${(value as number).toFixed(2)} m`,
            };
        case AdditionalInformationKey.Y:
            return {
                label: "Y",
                value: `${(value as number).toFixed(2)} m`,
            };
        default:
            return null;
    }
}

function makeAdditionalInformation(item: ReadoutItem): { label: string; value: string }[] {
    const additionalInformation = getAdditionalInformationFromReadoutItem(item);
    return Object.entries(additionalInformation)
        .map(([key, value]) => {
            return additionalInformationItemToReadableString(key, value);
        })
        .filter((el): el is { label: string; value: string } => el !== null);
}

function convertAdditionalInformationToHtml(items: { label: string; value: string }[]): React.ReactNode {
    function formatValue(value: number | string): string {
        if (typeof value === "number") {
            return value.toFixed(2);
        }
        return value.toString();
    }

    return items.map((el, index) => {
        return (
            <div className="table-row" key={index}>
                <div className="table-cell w-32">{el.label}:</div>
                <div className="table-cell">{formatValue(el.value)}</div>
            </div>
        );
    });
}

export function ReadoutBox(props: ReadoutBoxProps): React.ReactNode {
    if (props.readoutItems.length === 0) {
        return null;
    }

    const sortedReadoutItems = props.readoutItems.sort((a, b) => {
        return b.layer.order - a.layer.order;
    });

    return (
        <div className="absolute rounded border border-neutral-300 bottom-10 right-12 bg-white bg-opacity-75 p-2 text-sm z-50 w-60 pointer-events-none backdrop-blur-sm">
            {sortedReadoutItems.map((item, index) => {
                if (index < (props.maxNumItems ?? 3)) {
                    return (
                        <>
                            <div className="flex gap-2 font-bold items-center">
                                <div
                                    className="rounded-full w-3 h-3 border border-slate-500"
                                    style={{ backgroundColor: getColorFromLayerData(item.layer, item.index) }}
                                />
                                {getLabelFromLayerData(item)}
                            </div>
                            <div className="table">
                                {convertAdditionalInformationToHtml(makeAdditionalInformation(item))}
                            </div>
                        </>
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
