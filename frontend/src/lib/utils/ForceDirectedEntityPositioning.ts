import { cloneDeep } from "lodash";

export type Entity = {
    coordinates: [number, number];
    anchorCoordinates: [number, number];
};

export type ForceDirectedEntityPositioningOptions = {
    springRestLength?: number;
    springConstant?: number;
    chargeConstant?: number;
    tolerance?: number;
    maxIterations?: number;
};
export class ForceDirectedEntityPositioning<TEntity extends Entity> {
    private _entities: TEntity[] = [];
    private _adjustedEntities: TEntity[] = [];

    private _options: {
        [K in keyof ForceDirectedEntityPositioningOptions]-?: ForceDirectedEntityPositioningOptions[K];
    } = {
        chargeConstant: 50,
        springConstant: 0.00001,
        springRestLength: 0,
        tolerance: 0.1,
        maxIterations: 10000,
    };

    constructor(entities: TEntity[], options?: ForceDirectedEntityPositioningOptions) {
        this._entities = entities;

        if (options) {
            this._options = {
                ...this._options,
                ...options,
            };
        }
    }

    reset(): void {
        this._adjustedEntities = cloneDeep(this._entities);
    }

    run(): TEntity[] {
        this.reset();

        this.iterateUntilConvergence();

        return this._adjustedEntities;
    }

    iterateUntilConvergence(): void {
        for (let i = 0; i < this._options.maxIterations; i++) {
            const totalForce = this.iterate();

            if (totalForce < this._options.tolerance) {
                break;
            }

            if (i === this._options.maxIterations - 1) {
                console.warn(
                    "Force-directed label positioning did not converge within the maximum number of iterations."
                );
            }
        }
    }

    private iterate(): number {
        let aggregatedTotalForce: number = 0;

        for (let i = 0; i < this._adjustedEntities.length; i++) {
            let totalForce: [number, number] = [0, 0];

            // First, calculate the attraction force (spring force) between the entity and its anchor
            const entity = this._adjustedEntities[i];

            const coordinates = entity.coordinates;
            const anchorCoordinates = entity.anchorCoordinates;

            const [fAx, fAy] = this.calcAttractionForce(coordinates, anchorCoordinates);
            totalForce = [totalForce[0] + fAx, totalForce[1] + fAy];

            // Next, calculate the repulsion force between the entity and all other entities and their anchors
            for (let j = 0; j < this._adjustedEntities.length; j++) {
                if (i === j) {
                    continue;
                }

                const otherEntity = this._adjustedEntities[j];

                const [fRx, fRy] = this.calcRepulsionForce(
                    coordinates,
                    otherEntity.coordinates,
                    this._options.chargeConstant
                );
                totalForce = [totalForce[0] + fRx, totalForce[1] + fRy];

                const [fRx2, fRy2] = this.calcRepulsionForce(
                    coordinates,
                    otherEntity.anchorCoordinates,
                    this._options.chargeConstant / 2
                );
                totalForce = [totalForce[0] + fRx2, totalForce[1] + fRy2];
            }

            this._adjustedEntities[i] = {
                ...entity,
                coordinates: [coordinates[0] + totalForce[0], coordinates[1] + totalForce[1]],
            };

            aggregatedTotalForce += Math.sqrt(totalForce[0] ** 2 + totalForce[1] ** 2);
        }

        return aggregatedTotalForce;
    }

    private calcAttractionForce(point: [number, number], otherPoint: [number, number]): [number, number] {
        const d = Math.sqrt((point[0] - otherPoint[0]) ** 2 + (point[1] - otherPoint[1]) ** 2);
        const dx = Math.sqrt((point[0] - otherPoint[0]) ** 2);
        const dy = Math.sqrt((point[1] - otherPoint[1]) ** 2);

        let directionX = (otherPoint[0] - point[0]) / dx;
        let directionY = (otherPoint[1] - point[1]) / dy;
        if (Number.isNaN(directionX)) {
            directionX = 0;
        }
        if (Number.isNaN(directionY)) {
            directionY = 0;
        }

        const force = this._options.springConstant * (d - this._options.springRestLength);

        return [force * directionX, force * directionY];
    }

    private calcRepulsionForce(point: [number, number], otherPoint: [number, number], beta = 10): [number, number] {
        let d = Math.sqrt((point[0] - otherPoint[0]) ** 2 + (point[1] - otherPoint[1]) ** 2);
        if (d === 0) {
            d = 0.0001;
        }
        const directionX = (point[0] - otherPoint[0]) / d;
        const directionY = (point[1] - otherPoint[1]) / d;

        const force = beta / d ** 2;

        return [force * directionX, force * directionY];
    }
}
