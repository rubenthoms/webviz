export enum LayerStatus {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ERROR = "ERROR",
    SUCCESS = "SUCCESS",
}

export interface Layer {
    getStatus(): LayerStatus;
}

export class GridLayer implements Layer {
    constructor() {}

    getStatus(): LayerStatus {
        return LayerStatus.IDLE;
    }
}
