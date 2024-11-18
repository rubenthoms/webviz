import { CompositeLayer, CompositeLayerProps, Layer, UpdateParameters } from "@deck.gl/core";
import { IconLayer } from "@deck.gl/layers";

const CROSSHAIR_SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="150px" height="150px"
	 viewBox="0 0 150 150" xml:space="preserve">
<rect x="72" y="72" width="9" height="9" fill="#eb4034" />
<rect x="9" y="72" width="54" height="9" fill="#eb4034" />
<rect x="72" y="9" width="9" height="54" fill="#eb4034" />
<rect x="90" y="72" width="54" height="9" fill="#eb4034" />
<rect x="72" y="90" width="9" height="54" fill="#eb4034" />
</svg>`;

export type CursorTrackingLayerProps = {
    id: string;
    worldCoordinates: [number, number] | null;
};

function svgToDataURL(svg: string): string {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export class CursorTrackingLayer extends CompositeLayer<CursorTrackingLayerProps> {
    static layerName: string = "CursorTrackingLayer";
    private _icon = {
        id: "cursor-tracking-icon",
        url: svgToDataURL(CROSSHAIR_SVG),
        width: 150,
        height: 150,
    };
    private _data: [number, number, number][] = [];

    updateState(params: UpdateParameters<Layer<CursorTrackingLayerProps & Required<CompositeLayerProps>>>): void {
        this._data = this.props.worldCoordinates ? [[...this.props.worldCoordinates, 0]] : [];
    }

    renderLayers() {
        if (!this.props.worldCoordinates) {
            return [];
        }

        return [
            new IconLayer(
                this.getSubLayerProps({
                    id: "cursor-tracking-icon-layer",
                    getIcon: () => this._icon,
                    data: this._data,
                    getPosition: (d: [number, number, number]) => d,
                    getSize: 24,
                    sizeUnits: "pixels",
                    getColor: () => [0, 0, 0],
                    pickable: false,
                })
            ),
        ];
    }
}
