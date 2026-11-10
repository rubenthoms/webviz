import type { FaceData } from "./types";

export const DEFAULT_PARTICLE_DENSITIES = [10_000, 50_000, 100_000, 500_000, 1_000_000];

export const FACES = ["I", "J", "K", "-I", "-J", "-K"] as const;

export const FACE_VELOCITY_VECTOR: FaceData<[number, number, number]> = {
    I: [1, 0, 0],
    J: [0, 1, 0],
    K: [0, 0, 1],
    "-I": [-1, 0, 0],
    "-J": [0, -1, 0],
    "-K": [0, 0, -1],
};

export const FACE_CORNERS: FaceData<[number, number, number, number]> = {
    I: [1, 5, 7, 3],
    J: [2, 6, 7, 3],
    K: [4, 5, 7, 6],
    "-I": [0, 4, 6, 2],
    "-J": [0, 4, 5, 1],
    "-K": [0, 1, 3, 2],
};
