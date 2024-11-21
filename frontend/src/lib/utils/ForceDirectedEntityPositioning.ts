import { cloneDeep } from "lodash";

export interface Entity {
    coordinates: [number, number];
    anchorCoordinates: [number, number];
    chargeMagnitude?: number; // The charge magnitude of the entity. The higher the charge, the higher the repulsion. If not set, it is assumed to be 1.
}

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

            // Next, calculate the repulsion forces between the entity and all other entities and their anchors
            for (let j = 0; j < this._adjustedEntities.length; j++) {
                if (i === j) {
                    continue;
                }

                const otherEntity = this._adjustedEntities[j];

                const [fRx, fRy] = this.calcRepulsionForce(
                    coordinates,
                    otherEntity.coordinates,
                    this._options.chargeConstant * (entity.chargeMagnitude ?? 1) * (otherEntity.chargeMagnitude ?? 1)
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
        let dx = otherPoint[0] - point[0];
        let dy = otherPoint[1] - point[1];

        if (dx === 0 && dy === 0) {
            // If the points are at the same location, we add a small random offset to avoid division by zero.
            dx = 0.01;
            dy = 0.01;
        }

        const d = Math.sqrt(dx ** 2 + dy ** 2);

        // Hooke's law: F = k * x
        const force = this._options.springConstant * (d - this._options.springRestLength);

        // The force vector is co-linear to the spring given by the line between the two points.
        // Hence, we can use the similarity theorems for triangles to calculate the force components.
        // Moreover, we get the directions of the forces by the difference between the two points.
        return [(force * dx) / d, (force * dy) / d];
    }

    private calcRepulsionForce(point: [number, number], otherPoint: [number, number], beta: number): [number, number] {
        let dx = point[0] - otherPoint[0];
        let dy = point[1] - otherPoint[1];

        if (dx === 0 && dy === 0) {
            // If the points are at the same location, we add a small random offset to avoid division by zero.
            dx = 0.01;
            dy = 0.01;
        }

        const d = Math.sqrt(dx ** 2 + dy ** 2);

        // Coulomb's law: F = (|Q * q|) / (4 * pi * eps0) * 1 / d^2 = beta / d^2.
        const force = beta / d ** 2;

        // The force vector is co-linear to the line between the two points.
        // Hence, we can use the similarity theorems for triangles to calculate the force components.
        // Moreover, we get the directions of the forces by the difference between the two points.
        return [(force * dx) / d, (force * dy) / d];
    }
}
