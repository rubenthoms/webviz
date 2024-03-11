import { OnRescaleEvent, OnUpdateEvent, PixiLayer } from "@equinor/esv-intersection";
import { pointDistance } from "@lib/utils/geometry";

import { Graphics } from "pixi.js";
import { g } from "vitest/dist/suite-UrZdHRff";

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

export class GridIntersectionLayer extends PixiLayer<GridIntersectionData> {
    private isPreRendered = false;

    override onRescale(event: OnRescaleEvent): void {
        super.onRescale(event);

        if (!this.isPreRendered) {
            this.clearLayer();
            this.preRender();
        }

        this.render();
    }

    override onUpdate(event: OnUpdateEvent<GridIntersectionData>): void {
        super.onUpdate(event);

        this.isPreRendered = false;
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

    createFenceMeshSection(offsetU: number, section: FenceMeshSection) {
        const graphics = new Graphics();

        graphics.lineStyle(1, 0x000000, 0.5);
        graphics.beginFill(0x000000, 0.5);

        let idx = 0;
        while (idx < section.polysArr.length) {
            const polySize = section.polysArr[idx];
            const polyVertices: number[] = [];
            for (let i = 0; i < polySize; i++) {
                const verticeIndex = section.polysArr[idx + 1 + i] * 2;
                const verticeU = section.verticesUzArr[verticeIndex];
                const verticeZ = section.verticesUzArr[verticeIndex + 1];
                polyVertices.push(offsetU + verticeU, verticeZ);
            }

            graphics.drawPolygon(polyVertices);

            idx += polySize + 1;
        }

        graphics.endFill();

        this.addChild(graphics);
    }
}
