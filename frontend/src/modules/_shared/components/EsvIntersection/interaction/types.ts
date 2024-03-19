import { Layer, SchematicData } from "@equinor/esv-intersection";

export interface BoundingVolume {
    contains(point: number[]): boolean;
}

export enum Shape {
    POINT = "point",
    LINE = "line",
    LINE_SET = "lineset",
    POLYGON = "polygon",
    POLYGONS = "polygons",
    WELLBORE_PATH = "wellbore-path",
    WELLBORE_SECTION = "wellbore-section",
}

export type PolygonData = {
    vertices: Float32Array;
    polygons: Uint32Array;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
};

export type IntersectionItem = {
    id: string;
} & (
    | {
          shape: Shape.POINT;
          data: number[];
      }
    | {
          shape: Shape.LINE;
          data: number[][];
      }
    | {
          shape: Shape.LINE_SET;
          data: number[][][];
      }
    | {
          shape: Shape.POLYGON;
          data: number[][];
      }
    | {
          shape: Shape.POLYGONS;
          data: PolygonData;
      }
    | {
          shape: Shape.WELLBORE_PATH;
      }
);

export interface IntersectedItem {
    shape: Shape;
    point: number[];
}

export type HighlightItem = {
    color: string;
} & (
    | {
          shape: Shape.POINT;
          point: number[];
      }
    | {
          shape: Shape.LINE;
          line: number[][];
      }
    | {
          shape: Shape.POLYGON;
          polygon: number[][];
      }
);

export type ReadoutItem = {
    layer: Layer<unknown>;
    index: number;
    point: number[];
    points?: number[][];
    md?: number;
    polygonIndex?: number;
    schematicType?: keyof SchematicData;
};

export interface IntersectionCalculator {
    calcIntersection(point: number[]): IntersectedItem | null;
}

export type LayerDataItem = {
    id: string;
    layer: Layer<unknown>;
    index: number;
    intersectionItem: IntersectionItem;
};
