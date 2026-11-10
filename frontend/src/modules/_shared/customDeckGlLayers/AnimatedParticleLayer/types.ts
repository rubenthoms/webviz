import type { FACES } from "./constants";

export type GridCell = {
    index: number;
    /* 
        Corner positions, in order as:
        TODO
    */
    corners: number[][];

    /* Ordered as: x, y, z, -x, -y, -z */
    faceVelocities: number[][];
    /** Neighboring cells, ordered as: x, y, z, -x, -y, -z */
    neighborIndices: FaceData<number>;
};

export type Faces = (typeof FACES)[number];

export type FaceData<TData> = {
    [K in Faces]: TData;
};
