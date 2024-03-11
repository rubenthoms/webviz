import {
    Layer,
    LayerOptions,
    OnRescaleEvent,
    OnUpdateEvent,
    PixiLayer,
    PixiRenderApplication,
} from "@equinor/esv-intersection";
import { ColorScale } from "@lib/utils/ColorScale";
import { pointDistance } from "@lib/utils/geometry";

import { Graphics } from "pixi.js";

type FenceMeshSection = {
    verticesUzArr: Float64Array; // [u, z]
    polysArr: Uint32Array;
    polySourceCellIndicesArr: Uint32Array;
    polyPropsArr: Float64Array;
    startUtmX: number;
    startUtmY: number;
    endUtmX: number;
    endUtmY: number;
};

export type GridIntersectionData = {
    fenceMeshSections: FenceMeshSection[];
    minGridPropValue: number;
    maxGridPropValue: number;
};

export type GridIntersectionLayerOptions = LayerOptions<GridIntersectionData> & {
    colorScale: ColorScale;
};

export class GridIntersectionLayer extends PixiLayer<GridIntersectionData> {
    private _isPreRendered = false;
    private _colorScale: ColorScale;

    constructor(ctx: PixiRenderApplication, id: string, options: GridIntersectionLayerOptions) {
        super(ctx, id, options);
        this._colorScale = options.colorScale;
        this._colorScale.setRange(options.data?.minGridPropValue ?? 0, options.data?.maxGridPropValue ?? 1000);
    }

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);

        if (!this._isPreRendered) {
            this.clearLayer();
            this.preRender();
        }

        this.render();
    }

    override onUpdate(event: OnUpdateEvent<GridIntersectionData>): void {
        super.onUpdate(event);

        this._colorScale.setRange(event.data?.minGridPropValue ?? 0, event.data?.maxGridPropValue ?? 1000);

        this._isPreRendered = false;
        this.clearLayer();
        this.preRender();
        this.render();
    }

    preRender(): void {
        if (!this.data) {
            return;
        }

        let startU = 0;
        this.data.fenceMeshSections.forEach((section) => {
            this.createFenceMeshSection(startU, section);
            const uVectorLength = pointDistance(
                {
                    x: section.startUtmX,
                    y: section.startUtmY,
                },
                {
                    x: section.endUtmX,
                    y: section.endUtmY,
                }
            );
            startU += uVectorLength;
        });
    }

    createFenceMeshSection(offsetU: number, section: FenceMeshSection): void {
        const graphics = new Graphics();

        let idx = 0;
        let polygonIndex = 0;
        while (idx < section.polysArr.length) {
            const color = this._colorScale.getColorForValue(section.polyPropsArr[polygonIndex]);

            graphics.lineStyle(1, color, 0.5);
            graphics.beginFill(color, 0.5);
            const polySize = section.polysArr[idx];
            const polyVertices: number[] = [];
            for (let i = 0; i < polySize; i++) {
                const verticeIndex = section.polysArr[idx + 1 + i] * 2;
                const verticeU = section.verticesUzArr[verticeIndex];
                const verticeZ = section.verticesUzArr[verticeIndex + 1];
                polyVertices.push(offsetU + verticeU, verticeZ);
            }

            graphics.drawPolygon(polyVertices);
            graphics.endFill();

            idx += polySize + 1;
            polygonIndex++;
        }

        this.addChild(graphics);
    }
}
