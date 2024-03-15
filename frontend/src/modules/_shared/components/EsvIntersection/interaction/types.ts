export interface BoundingVolume {
    contains(point: number[]): boolean;
}

export enum Shape {
    POINT = "point",
    LINE = "line",
    POLYGON = "polygon",
}

export type PolygonData = {
    vertices: Float32Array;
    polygons: Uint32Array;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
};

export type IntersectionObject = {
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
          shape: Shape.POLYGON;
          data: PolygonData;
      }
);

export interface IntersectionResult {
    shape: Shape;
    point: number[];
}

export type HighlightObject = {
    color: string;
} & (
    | {
          shape: Shape.POINT;
          point: number[];
      }
    | {
          shape: Shape.LINE;
          points: number[][];
      }
    | {
          shape: Shape.POLYGON;
          polygon: number[][];
      }
);

export interface IntersectionCalculator {
    calcIntersection(point: number[]): IntersectionResult | null;
}
